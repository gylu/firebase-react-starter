#!/usr/bin/env python3

"""
CLI script `cp.py`: copy directory structure and contents, always respecting `.gitignore` by default.
Use `--no-gitignore` to disable.

Examples:
    # Copy current directory (.) up to 3 levels deep, include contents, respect .gitignore:
    python cp.py

    # Copy './src', 2 levels deep, include contents, ignore .ipynb, respect .gitignore:
    python cp.py ./src 2 True True

    # Copy './project', unlimited depth (-1), without contents (structure only), respect .gitignore:
    python cp.py ./project -1 False True

    # Copy, ignoring .gitignore rules (--no-gitignore), ignore markdown files, send to clipboard:
    python cp.py . 3 True True '*.md' --no-gitignore --clipboard

    # Copy current directory and send results to system clipboard:
    python cp.py -c
"""

import os
import sys
import fnmatch
import argparse

# Optional clipboard support
try:
    import pyperclip
    CLIPBOARD_AVAILABLE = True
except ImportError:
    CLIPBOARD_AVAILABLE = False

# Optional pathspec support for .gitignore parsing
try:
    import pathspec
    PATHSPEC_AVAILABLE = True
except ImportError:
    PATHSPEC_AVAILABLE = False

# Global for repo root and raw .gitignore patterns
GITIGNORE_ROOT = None
RAW_GITIGNORE_PATTERNS = []

def find_git_root(start_dir):
    """Find the repository root by locating the nearest .git directory up the tree."""
    current = start_dir
    while True:
        if os.path.isdir(os.path.join(current, '.git')):
            return current
        parent = os.path.dirname(current)
        if parent == current:
            # reached filesystem root without finding .git
            return start_dir
        current = parent


def parse_gitignore(gitignore_path):
    """Load .gitignore and return a PathSpec (if available) or raw patterns list."""
    global RAW_GITIGNORE_PATTERNS
    if not os.path.isfile(gitignore_path):
        return None
    try:
        with open(gitignore_path, 'r') as f:
            lines = []
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                lines.append(line)
        RAW_GITIGNORE_PATTERNS = lines.copy()
        if PATHSPEC_AVAILABLE:
            return pathspec.PathSpec.from_lines('gitwildmatch', lines)
        return lines
    except Exception:
        return None


def should_ignore(path, start_dir, gitignore_spec, custom_patterns):
    """Return True if path matches .gitignore or custom ignore patterns."""
    abs_path = os.path.abspath(path)

    # Check against .gitignore (relative to repo root)
    if gitignore_spec:
        rel_repo = os.path.relpath(abs_path, GITIGNORE_ROOT).replace(os.sep, '/')
        if PATHSPEC_AVAILABLE:
            if gitignore_spec.match_file(rel_repo):
                return True
        # fallback raw patterns
        for pat in RAW_GITIGNORE_PATTERNS:
            if pat.endswith('/'):
                dir_pat = pat.rstrip('/')
                if rel_repo == dir_pat or rel_repo.startswith(dir_pat + '/'):
                    return True
            if fnmatch.fnmatch(rel_repo, pat) or fnmatch.fnmatch(os.path.basename(rel_repo), pat):
                return True

    # Check custom ignore patterns (relative to start directory)
    rel_start = os.path.relpath(abs_path, start_dir).replace(os.sep, '/')
    for pat in custom_patterns:
        if fnmatch.fnmatch(rel_start, pat) or fnmatch.fnmatch(os.path.basename(rel_start), pat):
            return True

    return False


def get_directory_structure(path, start_dir, max_depth, gitignore_spec, custom_patterns, depth=0):
    if not os.path.isdir(path):
        return f"Error: '{path}' is not a directory."

    indent = '  ' * depth
    name = path if depth == 0 else os.path.basename(path)
    lines = [f"{indent}└─ {name}/"]

    if max_depth != -1 and depth >= max_depth:
        return '\n'.join(lines)

    try:
        items = sorted(os.listdir(path))
    except PermissionError:
        lines.append(f"{indent}  ├─ [Permission Denied]")
        return '\n'.join(lines)

    # Files
    files = [i for i in items if os.path.isfile(os.path.join(path, i))]
    has_dirs = any(os.path.isdir(os.path.join(path, d)) for d in items)
    for idx, file in enumerate(files):
        file_path = os.path.join(path, file)
        if should_ignore(file_path, start_dir, gitignore_spec, custom_patterns):
            continue
        connector = '└─' if idx == len(files)-1 and not has_dirs else '├─'
        lines.append(f"{indent}  {connector} {file}")

    # Directories
    dirs = [d for d in items if os.path.isdir(os.path.join(path, d))]
    for d in dirs:
        dir_path = os.path.join(path, d)
        if should_ignore(dir_path, start_dir, gitignore_spec, custom_patterns):
            continue
        subtree = get_directory_structure(dir_path, start_dir, max_depth, gitignore_spec, custom_patterns, depth+1)
        lines.append(subtree)

    return '\n'.join(lines)


def get_file_contents(path, start_dir, max_depth, gitignore_spec, custom_patterns, depth=0):
    if not os.path.isdir(path) or (max_depth != -1 and depth >= max_depth):
        return ''

    out = []
    try:
        items = sorted(os.listdir(path))
    except PermissionError:
        return ''

    # Files
    for file in [i for i in items if os.path.isfile(os.path.join(path, i))]:
        file_path = os.path.join(path, file)
        if should_ignore(file_path, start_dir, gitignore_spec, custom_patterns):
            continue
        out.append(f"\n--- {os.path.abspath(file_path)} ---")
        try:
            with open(file_path, 'r', errors='replace') as f:
                out.append(f.read())
        except Exception as e:
            out.append(f"<<Error reading {file}: {e}>>")

    # Directories
    for d in [i for i in items if os.path.isdir(os.path.join(path, i))]:
        dir_path = os.path.join(path, d)
        if should_ignore(dir_path, start_dir, gitignore_spec, custom_patterns):
            continue
        out.append(get_file_contents(dir_path, start_dir, max_depth, gitignore_spec, custom_patterns, depth+1))

    return '\n'.join(out)


def main():
    parser = argparse.ArgumentParser(description='Copy directory structure and contents, respecting .gitignore.')
    parser.add_argument('start', nargs='?', default='.', help='Start directory (default: .)')
    parser.add_argument('depth', nargs='?', type=int, default=3, help='Max depth (-1 unlimited)')
    parser.add_argument('contents', nargs='?', type=lambda x: x.lower()=='true', default=True,
                        help='Include contents? True/False')
    parser.add_argument('ignore_ipynb', nargs='?', type=lambda x: x.lower()=='true', default=True,
                        help='Ignore .ipynb? True/False')
    parser.add_argument('custom', nargs='*', help='Extra ignore patterns')
    parser.add_argument('--no-gitignore', action='store_true', help='Disable .gitignore')
    parser.add_argument('-c', '--clipboard', action='store_true', help='Copy to clipboard')
    args = parser.parse_args()

    if not PATHSPEC_AVAILABLE:
        print("Warning: install pathspec for full .gitignore support.")

    # Determine repo root and load .gitignore
    cwd = os.getcwd()
    global GITIGNORE_ROOT
    GITIGNORE_ROOT = find_git_root(cwd)
    gitignore_path = os.path.join(GITIGNORE_ROOT, '.gitignore')
    gitignore_spec = None if args.no_gitignore else parse_gitignore(gitignore_path)

    if args.no_gitignore:
        print(".gitignore filtering disabled")
    elif gitignore_spec:
        print(f"Loaded .gitignore from: {gitignore_path}")
    else:
        print(f"No .gitignore found at: {gitignore_path}")

    # Prepare start directory and custom patterns
    start_dir = os.path.abspath(args.start)
    custom_patterns = args.custom or []
    if args.ignore_ipynb:
        custom_patterns.append('*.ipynb')
    # Always ignore pack-lock.json by default
    custom_patterns.append('package-lock.json')
    custom_patterns.append('.gitignore')
    custom_patterns.append('README.md')

    # Generate structure and contents
    tree = get_directory_structure(start_dir, start_dir, args.depth, gitignore_spec, custom_patterns)
    out = f"Directory Structure:\n{tree}"
    if args.contents:
        contents = get_file_contents(start_dir, start_dir, args.depth, gitignore_spec, custom_patterns)
        if contents:
            out += f"\n\nFile Contents:{contents}"

    print(out)

    # Clipboard copy
    if args.clipboard:
        if not CLIPBOARD_AVAILABLE:
            print("Clipboard not available. Install pyperclip.")
        else:
            try:
                pyperclip.copy(out)
                print("Copied to clipboard.")
            except Exception as e:
                print(f"Clipboard error: {e}")

if __name__ == '__main__':
    main()
