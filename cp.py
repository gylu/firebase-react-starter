#!/usr/bin/env python3

"""
cp.py - Directory Structure and Content Copier

A command-line utility to generate a text representation of a directory's structure
and, optionally, the contents of its files. It respects `.gitignore` rules by
default and allows for additional custom ignore patterns.

Features:
* Generates a tree-like view of the directory structure, showing all items not
  excluded by ignore rules.
* Optionally includes the full content of files within the specified depth.
* Respects `.gitignore` rules found in the repository root by default (requires
  `pathspec` library for full accuracy, falls back to basic matching).
* Allows disabling `.gitignore` processing (`--no-gitignore`).
* Accepts custom ignore patterns (e.g., `*.log`, `temp/`).
* Allows specifying one or more include patterns (`--include`) which filter
  **only** which file **contents** are displayed. The directory structure remains
  unfiltered (respecting only ignore rules). Matching is case-insensitive and
  supports wildcards.
* Controls the maximum depth of directory traversal.
* Optionally copies the output directly to the system clipboard (`-c` or
  `--clipboard`, requires `pyperclip`).
* Defaults to ignoring `.ipynb`, `*lock.json` (e.g., `package-lock.json`),
  `.git/`, `__pycache__/`, `node_modules/` (can be overridden by modifying
  the script's defaults or using --no-gitignore).

Dependencies:
* Python 3
* Optional:
    * `pathspec`: For full and accurate `.gitignore` pattern matching. Install via
      `pip install pathspec`. If not installed, a basic fallback matching is used.
    * `pyperclip`: To enable copying output to the clipboard (`-c` / `--clipboard`).
      Install via `pip install pyperclip`.

Usage:
    python cp.py [start_dir] [depth] [contents] [ignore_ipynb] [custom_ignore...] [options]

Arguments:
* start_dir: The starting directory path (default: `.`).
* depth: Maximum depth to traverse. Use `-1` for unlimited depth (default: `3`).
* contents: Whether to include file contents (`True` or `False`, default: `True`).
* ignore_ipynb: Whether to automatically ignore `*.ipynb` files (`True` or `False`,
  default: `True`).
* custom_ignore...: Zero or more custom glob patterns to ignore (e.g., `*.tmp`,
  `docs/`).

Options:
* --no-gitignore: Disable reading and processing `.gitignore` files.
* --include PATTERN [PATTERN ...]: Filter file **contents** to ONLY show those from files
  matching **any** of the specified `PATTERN`(s). The directory structure will
  still show all non-ignored items. Matching is case-insensitive, wildcards allowed.
* -c, --clipboard: Copy the final output to the system clipboard.

Examples:

1.  Basic Usage (Current Directory, Depth 3):
    Show structure and contents of the current directory up to 3 levels deep,
    respecting `.gitignore`.
    ```bash
    python cp.py
    ```

2.  Structure Only, Unlimited Depth:
    Show only the directory structure of `./project` with no depth limit,
    respecting `.gitignore`.
    ```bash
    python cp.py ./project -1 False
    ```

3.  Include Only Python File Contents:
    Show the *full* directory structure (respecting ignores), but in the
    "File Contents" section, *only* include the content of files ending
    with `.py`.
    ```bash
    python cp.py --include "*.py"
    ```

4.  Include Python and YAML File Contents:
    Show the *full* directory structure (respecting ignores), but only
    include the content of files ending with `.py` OR `.yaml`.
    ```bash
    python cp.py --include "*.py" "*.yaml"
    ```

5.  Include Specific File Content, No Gitignore:
    Show the *full* directory structure (ignoring `.gitignore`), but only
    display the content for `config.yaml`.
    ```bash
    python cp.py --include "config.yaml" --no-gitignore
    ```

6.  Custom Ignore, Include Specific Contents, To Clipboard:
    Show full structure (respecting `.gitignore`), ignore `*.log` files,
    only show contents of files starting with `data_` OR ending with `.csv`,
    copy to clipboard.
    ```bash
    python cp.py . 5 --include "data_*" "*.csv" -c '*.log'
    ```

Note: Ignore rules (`.gitignore`, custom patterns, defaults) always apply to both
the structure and content. The `--include` flag *only* further filters which file
contents are displayed *after* the ignore rules have been applied.
"""

import os
import sys
import fnmatch
import argparse

# --- Optional Dependencies ---
try:
    import pyperclip
    CLIPBOARD_AVAILABLE = True
except ImportError:
    CLIPBOARD_AVAILABLE = False

try:
    import pathspec
    PATHSPEC_AVAILABLE = True
except ImportError:
    PATHSPEC_AVAILABLE = False

# --- Globals ---
GITIGNORE_ROOT = None
RAW_GITIGNORE_PATTERNS = [] # Stores raw lines for fallback or debugging

# --- Core Logic Functions ---

def find_git_root(start_dir):
    """Find the repository root (.git directory) starting from start_dir and moving up."""
    current = os.path.abspath(start_dir)
    while True:
        if os.path.isdir(os.path.join(current, '.git')):
            return current
        parent = os.path.dirname(current)
        if parent == current:
            # Reached filesystem root without finding .git
            return os.path.abspath(start_dir) # Default to start dir's absolute path
        current = parent

def parse_gitignore(gitignore_path):
    """Load .gitignore, return PathSpec object if available, else raw lines."""
    global RAW_GITIGNORE_PATTERNS
    RAW_GITIGNORE_PATTERNS = [] # Reset
    if not os.path.isfile(gitignore_path):
        return None
    try:
        # Read with utf-8, ignore errors in case of mixed encodings
        with open(gitignore_path, 'r', encoding='utf-8', errors='ignore') as f:
            lines = [line.strip() for line in f if line.strip() and not line.startswith('#')]
        RAW_GITIGNORE_PATTERNS = lines.copy()
        if PATHSPEC_AVAILABLE:
            return pathspec.PathSpec.from_lines('gitwildmatch', lines)
        else:
            return lines # Return raw lines as fallback spec
    except Exception as e:
        print(f"Warning: Could not parse .gitignore at {gitignore_path}: {e}", file=sys.stderr)
        return None

def should_ignore(path, start_dir, gitignore_spec, custom_patterns):
    """Check if a given path should be ignored based on gitignore and custom patterns."""
    abs_path = os.path.abspath(path)
    item_name = os.path.basename(path)

    # 1. Check .gitignore patterns (relative to GITIGNORE_ROOT)
    if gitignore_spec and GITIGNORE_ROOT:
        try:
            # Path relative to .gitignore location, using forward slashes
            rel_repo_path = os.path.relpath(abs_path, GITIGNORE_ROOT).replace(os.sep, '/')
            is_dir = os.path.isdir(abs_path)

            if PATHSPEC_AVAILABLE and isinstance(gitignore_spec, pathspec.PathSpec):
                 # pathspec handles files and directories (including those matching patterns without trailing slash)
                 if gitignore_spec.match_file(rel_repo_path):
                     return True
                 # Explicitly check with trailing slash for directory patterns if pathspec needs it
                 if is_dir and gitignore_spec.match_file(rel_repo_path + '/'):
                    return True

            elif isinstance(gitignore_spec, list): # Fallback using raw patterns
                for pat in gitignore_spec:
                    is_dir_pattern = pat.endswith('/')
                    pat_base = pat.rstrip('/')

                    # Match full path or basename using fnmatch
                    if is_dir_pattern:
                        # Match dir if path IS the pattern or path STARTS WITH pattern/
                         if rel_repo_path == pat_base or rel_repo_path.startswith(pat_base + '/'):
                             return True
                    elif fnmatch.fnmatch(rel_repo_path, pat) or fnmatch.fnmatch(item_name, pat):
                         # File pattern matches full path or name
                         return True
                    # Check if directory matches a file pattern (e.g., 'build' pattern ignoring 'build/' dir)
                    if is_dir and (fnmatch.fnmatch(rel_repo_path, pat) or fnmatch.fnmatch(item_name, pat)):
                        return True

        except ValueError:
            # Path is not relative to GITIGNORE_ROOT (e.g., different drive)
            pass
        except Exception as e:
            # Catch potential errors during path manipulation or matching
            print(f"Warning: Error during gitignore check for {path}: {e}", file=sys.stderr)

    # 2. Check custom ignore patterns (relative to start_dir)
    try:
        rel_start_path = os.path.relpath(abs_path, start_dir).replace(os.sep, '/')
        is_dir = os.path.isdir(abs_path) # Check again in case path was relative before
        for pat in custom_patterns:
            # Match against the relative path from start or just the basename
            if fnmatch.fnmatch(rel_start_path, pat) or fnmatch.fnmatch(item_name, pat):
                return True
            # Also check if a dir matches a pattern ending with '/'
            if is_dir and pat.endswith('/') and fnmatch.fnmatch(rel_start_path + '/', pat):
                 return True
            # Check if a dir matches a file pattern (e.g., ignore 'output' dir with 'output' pattern)
            if is_dir and fnmatch.fnmatch(rel_start_path, pat) or fnmatch.fnmatch(item_name, pat):
                 return True

    except ValueError:
         # Path is not relative to start_dir
         pass
    except Exception as e:
        print(f"Warning: Error during custom ignore check for {path}: {e}", file=sys.stderr)

    return False

# MODIFIED: Takes a list of patterns
def should_include(name, include_patterns):
    """Check if a name matches ANY of the include patterns (case-insensitive)."""
    if not include_patterns:
        return True # No include patterns means contents are included (if not ignored)
    # Use lower() for consistent case-insensitivity
    name_lower = name.lower()
    for pattern in include_patterns:
        if fnmatch.fnmatch(name_lower, pattern.lower()):
            return True # Match found
    return False # No match found in any pattern

# MODIFIED: Removed include_pattern logic from this function
def get_directory_structure(path, start_dir, max_depth, gitignore_spec, custom_patterns, depth=0):
    """Generates the directory structure string, respecting ONLY ignore patterns."""
    if not os.path.isdir(path):
        return f"Error: '{path}' is not a valid directory."

    indent = '  ' * depth
    name = os.path.basename(path) if depth > 0 else path
    prefix = indent + "└─ " if depth > 0 else ""

    # --- Directory Filtering ---
    # Root directory (depth 0) is always processed initially.
    # Deeper directories are processed only if NOT ignored. Include pattern is irrelevant here.
    # Note: ignore check is done *before* calling recursively, see below.

    # --- List Items ---
    try:
        # Use scandir for potentially better performance, listdir is fine too
        items = sorted([entry.name for entry in os.scandir(path)])
        # Or stick to listdir if scandir causes issues:
        # items = sorted(os.listdir(path))
    except PermissionError:
        return f"{prefix}{name}/\n{indent}  └─ [Permission Denied]"
    except FileNotFoundError:
         return f"{prefix}{name}/ [Vanished during scan]"

    # --- Process Child Items ---
    child_lines = []
    # Separate listing for clarity, though could be done in one loop with checks
    files = [i for i in items if os.path.isfile(os.path.join(path, i))]
    dirs = [d for d in items if os.path.isdir(os.path.join(path, d))]

    child_entries = []

    # Files: Include in structure if NOT ignored.
    for file in files:
        file_path = os.path.join(path, file)
        if not should_ignore(file_path, start_dir, gitignore_spec, custom_patterns):
             child_entries.append({'name': file, 'type': 'file'}) # Always add if not ignored

    # Dirs: Recurse if NOT ignored.
    if max_depth == -1 or depth < max_depth:
        for d in dirs:
            dir_path = os.path.join(path, d)
            if not should_ignore(dir_path, start_dir, gitignore_spec, custom_patterns):
                # Recursive call NO LONGER needs include_patterns
                subtree_str = get_directory_structure(
                    dir_path, start_dir, max_depth, gitignore_spec,
                    custom_patterns, depth + 1
                )
                if subtree_str: # Only add if recursion yielded something (wasn't empty/denied)
                    child_entries.append({'name': d, 'type': 'dir', 'subtree': subtree_str})

    # --- Format Output ---
    dir_header = f"{prefix}{name}/"
    lines = [dir_header]

    num_entries = len(child_entries)
    if num_entries == 0 and depth > 0 :
         # If a directory is kept (not ignored) but is empty or all its contents
         # were ignored, it will just show the directory header line.
         pass # No need to explicitly handle empty directories unless desired

    for i, entry in enumerate(child_entries):
        is_last = (i == num_entries - 1)
        connector = "└─" if is_last else "├─"
        item_indent = indent + "  "

        if entry['type'] == 'file':
            lines.append(f"{item_indent}{connector} {entry['name']}")
        elif entry['type'] == 'dir':
            # Append the formatted subtree from the recursive call
            subtree_lines = entry['subtree'].splitlines()
            if subtree_lines:
                first_line = subtree_lines[0]
                # Find the name in the first line "  └─ dirname/" to prepend correctly
                # Use os.path.basename to handle potential nested structures correctly
                base_name = os.path.basename(entry['name'])
                try:
                    # Find the last occurrence of the basename to handle cases like dir/dir/
                    name_start_index = first_line.rindex(base_name)
                    # Ensure we don't accidentally match part of the indent/connector
                    if name_start_index > len(item_indent) + len(connector):
                         lines.append(f"{item_indent}{connector} {first_line[name_start_index:]}")
                         # Adjust indentation for subsequent lines based on the *new* prefix
                         sub_indent = " " * (len(item_indent) + len(connector) + 1 + name_start_index - len(first_line.lstrip()))
                         lines.extend([sub_indent + line for line in subtree_lines[1:]])
                    else: # Fallback if index seems wrong
                         lines.append(f"{item_indent}{connector} {first_line.lstrip()}") # Add first line, stripping its indent
                         lines.extend([item_indent + "  " + line for line in subtree_lines[1:]]) # Indent rest relative to current
                except ValueError: # Fallback if rindex fails
                     lines.append(f"{item_indent}{connector} [Error reconstructing subtree for {entry['name']}]")
                     print(f"Debug: Could not find '{base_name}' in '{first_line}'", file=sys.stderr) # Debugging help

    return '\n'.join(lines)


# MODIFIED: Takes include_patterns (plural)
def get_file_contents(path, start_dir, max_depth, gitignore_spec, custom_patterns, include_patterns, depth=0):
    """Recursively gets contents of files respecting ignore patterns AND include patterns for filtering."""
    if not os.path.isdir(path) or (max_depth != -1 and depth > max_depth):
        return ''

    try:
        # Use scandir for potentially better performance, listdir is fine too
        items = sorted([entry.name for entry in os.scandir(path)])
         # Or stick to listdir if scandir causes issues:
         # items = sorted(os.listdir(path))
    except (PermissionError, FileNotFoundError):
        return ''

    out_parts = []

    # Separate file/dir processing for clarity
    files = [i for i in items if os.path.isfile(os.path.join(path, i))]
    dirs = [d for d in items if os.path.isdir(os.path.join(path, d))]

    # Files at current level: Check ignore, then include
    for file in files:
        file_path = os.path.join(path, file)
        if not should_ignore(file_path, start_dir, gitignore_spec, custom_patterns):
            # *** Include patterns check happens HERE for contents ***
            if should_include(file, include_patterns): # Pass the list of patterns
                abs_file_path = os.path.abspath(file_path)
                rel_file_path = os.path.relpath(abs_file_path, start_dir) # Use relative path for output clarity
                out_parts.append(f"\n--- File: {rel_file_path} ---")
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
                        out_parts.append(f.read())
                except Exception as e:
                    out_parts.append(f"<<Error reading file {rel_file_path}: {e}>>")

    # Recurse into subdirectories if not ignored
    if max_depth == -1 or depth < max_depth:
        for d in dirs:
            dir_path = os.path.join(path, d)
            if not should_ignore(dir_path, start_dir, gitignore_spec, custom_patterns):
                 # Recursive call still needs include_patterns to filter files deeper down
                 contents_subtree = get_file_contents(
                     dir_path, start_dir, max_depth, gitignore_spec,
                     custom_patterns, include_patterns, depth + 1 # Pass list
                 )
                 if contents_subtree:
                     out_parts.append(contents_subtree)

    return '\n'.join(out_parts)


# --- Main Execution ---

def main():
    parser = argparse.ArgumentParser(
        description='Copy directory structure and optionally file contents, respecting .gitignore and allowing content filtering with --include.',
        # Use the updated docstring for help text
        epilog=__doc__.split('Dependencies:')[1], # Show Usage/Examples from docstring
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    # Basic args
    parser.add_argument(
        'start', nargs='?', default='.',
        help='Start directory (default: current directory)'
        )
    parser.add_argument(
        'depth', nargs='?', type=int, default=3,
        help='Maximum directory depth to traverse (-1 for unlimited, default: 3)'
        )
    parser.add_argument(
        'contents', nargs='?', type=lambda x: x.lower() == 'true', default=True,
        help='Include file contents? (True/False, default: True)'
        )
    # Ignore args
    parser.add_argument(
        'ignore_ipynb', nargs='?', type=lambda x: x.lower() == 'true', default=True,
        help='Ignore *.ipynb files automatically? (True/False, default: True)'
        )
    parser.add_argument(
        'custom', nargs='*',
        help='Additional custom ignore patterns (space-separated list)'
        )
    parser.add_argument(
        '--no-gitignore', action='store_true',
        help='Disable .gitignore processing'
        )
    # Include arg (MODIFIED: accepts multiple patterns)
    parser.add_argument(
        '--include', nargs='+', default=None, # Use nargs='+' to accept one or more
        metavar='PATTERN', # Clarify expected value in help
        help='Filter file CONTENTS to only show those matching ANY specified PATTERN (case-insensitive, wildcards ok). Structure is unaffected.'
        )
    # Output args
    parser.add_argument(
        '-c', '--clipboard', action='store_true',
        help='Copy the output to the system clipboard (requires pyperclip)'
        )
    args = parser.parse_args()

    # --- Dependency Checks ---
    if args.clipboard and not CLIPBOARD_AVAILABLE:
        print("Warning: Clipboard option specified, but 'pyperclip' module not found. Skipping clipboard copy.", file=sys.stderr)
        print("Install it: pip install pyperclip", file=sys.stderr)
        args.clipboard = False # Disable clipboard if unavailable

    if not PATHSPEC_AVAILABLE and not args.no_gitignore:
        print("Warning: 'pathspec' module not found. .gitignore parsing will be basic.", file=sys.stderr)
        print("Install for full support: pip install pathspec", file=sys.stderr)

    # --- Setup ---
    start_dir_abs = os.path.abspath(args.start)
    if not os.path.isdir(start_dir_abs):
         print(f"Error: Start directory not found or not a directory: {args.start}", file=sys.stderr)
         sys.exit(1)

    global GITIGNORE_ROOT
    GITIGNORE_ROOT = find_git_root(start_dir_abs)
    gitignore_path = os.path.join(GITIGNORE_ROOT, '.gitignore')
    gitignore_spec = None
    gitignore_message = ""

    if not args.no_gitignore:
        gitignore_spec = parse_gitignore(gitignore_path)
        if gitignore_spec:
            gitignore_message = f"Using .gitignore rules from: {gitignore_path}"
            if not PATHSPEC_AVAILABLE: gitignore_message += " (basic matching)"
        else:
            gitignore_message = f"No .gitignore found or parsed at: {gitignore_path}"
    else:
        gitignore_message = ".gitignore processing is disabled."

    # Combine custom and default ignore patterns
    custom_patterns = args.custom or []
    if args.ignore_ipynb:
        custom_patterns.append('*.ipynb')
    # Add other common things to ignore by default
    custom_patterns.append('*lock.json') # Ignore package-lock.json, etc.
    custom_patterns.append('.git/')
    custom_patterns.append('__pycache__/')
    custom_patterns.append('node_modules/')
    # Consider adding others like *.pyc, *.DS_Store if needed

    # --- Generation ---
    final_output = []
    header_info = [
        f"Target Directory: {start_dir_abs}",
        f"Max Depth: {'Unlimited' if args.depth == -1 else args.depth}",
        gitignore_message
    ]
    # MODIFIED: Handle list of include patterns
    if args.include:
         include_patterns_str = ', '.join([f"'{p}'" for p in args.include])
         header_info.append(f"Include Filter (Contents Only): {include_patterns_str}")

    user_custom = args.custom or []
    default_ignores_in_use = []
    if args.ignore_ipynb: default_ignores_in_use.append("*.ipynb")
    default_ignores_in_use.append("*lock.json") # Reflect this default
    # Add others like '.git/' etc. if desired in header info
    default_ignores_in_use.append(".git/")
    default_ignores_in_use.append("__pycache__/")
    default_ignores_in_use.append("node_modules/")


    if user_custom or default_ignores_in_use:
         ignore_info = "Ignoring: "
         if user_custom: ignore_info += f"Custom={user_custom} "
         # Make sure the default list is presented clearly
         if default_ignores_in_use: ignore_info += f"Defaults=[{', '.join(default_ignores_in_use)}]" # Join for clarity
         header_info.append(ignore_info.strip())


    # Print header info to stderr for context
    print("\n".join(header_info), file=sys.stderr)
    print("-" * 20, file=sys.stderr) # Separator in stderr

    # Add basic info to the main output as well
    final_output.append(f"Directory: {start_dir_abs}")
    # MODIFIED: Handle list of include patterns in output header
    if args.include:
        include_patterns_str = ', '.join([f"'{p}'" for p in args.include])
        final_output.append(f"Contents Filter: {include_patterns_str}")
    final_output.append("=" * 20) # Separator


    try:
        # Generate structure (NO include patterns needed here)
        structure = get_directory_structure(
            start_dir_abs, start_dir_abs, args.depth, gitignore_spec,
            custom_patterns
        )
        if structure:
             final_output.append("Directory Structure:")
             final_output.append(structure)
        else:
             final_output.append("Directory Structure: (No items found or all ignored)")


        # Generate contents (include patterns ARE needed here)
        if args.contents:
            # Pass the list of include patterns (args.include)
            contents = get_file_contents(
                start_dir_abs, start_dir_abs, args.depth, gitignore_spec,
                custom_patterns, args.include # Pass the list here
            )
            if contents:
                final_output.append("\n" + ("=" * 20) + "\nFile Contents:")
                final_output.append(contents)
            elif structure and args.include: # Structure existed, but no contents matched include
                 final_output.append("\n" + ("=" * 20) + "\nFile Contents: (No file contents matched the include filter(s))")
            elif structure: # Structure existed, but no files or all files empty/unreadable
                 final_output.append("\n" + ("=" * 20) + "\nFile Contents: (No files found or content could not be read)")


    except Exception as e:
         print(f"\nAn error occurred during processing: {e}", file=sys.stderr)
         import traceback
         traceback.print_exc(file=sys.stderr)
         # Optionally add error message to main output too
         final_output.append("\n" + "="*20 + f"\nERROR during processing: {e}")
         # sys.exit(1) # Or allow script to finish and print partial output

    # --- Output ---
    full_output_str = '\n'.join(final_output)
    print(full_output_str) # Print main output to stdout

    if args.clipboard: # Check again in case it was disabled
        try:
            pyperclip.copy(full_output_str)
            print("\n" + ("-" * 20) + "\nOutput copied to clipboard.", file=sys.stderr)
        except Exception as e:
            print(f"\n--- Failed to copy to clipboard: {e} ---", file=sys.stderr)

if __name__ == '__main__':
    main()
