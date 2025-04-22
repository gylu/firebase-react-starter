import os
import json
# import psycopg2 # Uncomment if using PostgreSQL
# from google.cloud import bigquery # Uncomment if using BigQuery
# from google.cloud import secretmanager # Uncomment if using Secret Manager
# import stripe # Uncomment if using Stripe
# import firebase_admin # Uncomment if using Firebase Admin SDK
# from firebase_admin import credentials, auth as firebase_auth

from flask import Flask, request, jsonify
from dotenv import load_dotenv
from flask_cors import CORS # Import CORS

# Load environment variables from .env file (optional, useful for local dev)
load_dotenv()

app = Flask(__name__)
# IMPORTANT: Configure CORS correctly for your frontend URL in production.
# For development, allowing '*' is okay, but restrict it in production.
# Example: CORS(app, resources={r"/api/*": {"origins": "https://your-frontend-domain.com"}})
CORS(app) # Allows all origins by default

# --- Configuration (Load from Environment Variables or Secret Manager) ---
# It's STRONGLY recommended to use Secret Manager in GCP for sensitive data.
# Example using environment variables:
# POSTGRES_DB = os.environ.get('POSTGRES_DB')
# POSTGRES_USER = os.environ.get('POSTGRES_USER')
# POSTGRES_PASSWORD = os.environ.get('POSTGRES_PASSWORD') # Load from Secret Manager!
# POSTGRES_HOST = os.environ.get('POSTGRES_HOST') # e.g., '/cloudsql/project:region:instance' for Cloud SQL
# BQ_PROJECT_ID = os.environ.get('BQ_PROJECT_ID', 'your-gcp-project-id')
# BQ_DATASET_ID = os.environ.get('BQ_DATASET_ID', 'your_dataset')
# BQ_TABLE_ID = os.environ.get('BQ_TABLE_ID', 'your_table')
# STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY') # Load from Secret Manager!
# FIREBASE_SERVICE_ACCOUNT_KEY_PATH = os.environ.get('FIREBASE_SERVICE_ACCOUNT_KEY_PATH') # Path to service account JSON

# --- Initialization (Uncomment and configure as needed) ---

# # Initialize Firebase Admin SDK (if backend needs Firebase access)
# try:
#     if FIREBASE_SERVICE_ACCOUNT_KEY_PATH:
#         cred = credentials.Certificate(FIREBASE_SERVICE_ACCOUNT_KEY_PATH)
#         firebase_admin.initialize_app(cred)
#         print("Firebase Admin SDK initialized.")
#     else:
#         # For environments like Cloud Run/Functions, you might not need a key file
#         # if the service account has the right permissions.
#         firebase_admin.initialize_app()
#         print("Firebase Admin SDK initialized using application default credentials.")
# except Exception as e:
#     print(f"Error initializing Firebase Admin SDK: {e}")


# # Initialize Stripe (if using Stripe backend)
# if STRIPE_SECRET_KEY:
#     stripe.api_key = STRIPE_SECRET_KEY
#     print("Stripe initialized.")
# else:
#     print("Stripe secret key not found. Stripe integration disabled.")


# # Initialize BigQuery Client (if using BigQuery)
# try:
#     bq_client = bigquery.Client(project=BQ_PROJECT_ID)
#     print(f"BigQuery client initialized for project {BQ_PROJECT_ID}.")
# except Exception as e:
#     print(f"Error initializing BigQuery client: {e}")
#     bq_client = None


# # Function to get PostgreSQL connection (if using Cloud SQL or other Postgres)
# def get_postgres_conn():
#     try:
#         conn = psycopg2.connect(
#             dbname=POSTGRES_DB,
#             user=POSTGRES_USER,
#             password=POSTGRES_PASSWORD,
#             host=POSTGRES_HOST
#             # For Cloud SQL Unix Socket (recommended):
#             # host=f'/cloudsql/{YOUR_INSTANCE_CONNECTION_NAME}'
#             # e.g., host='/cloudsql/my-project:us-central1:my-instance'
#             # Ensure the Cloud SQL Proxy is running or the service account has permissions.

#             # For Cloud SQL TCP:
#             # host=YOUR_INSTANCE_PUBLIC_IP (or private IP if using VPC)
#             # sslmode='require' # Recommended for TCP
#         )
#         print("PostgreSQL connection successful.")
#         return conn
#     except Exception as e:
#         print(f"Error connecting to PostgreSQL: {e}")
#         return None

# --- Routes ---

@app.route('/')
def index():
    """ Basic health check route. """
    return jsonify({"status": "ok", "message": "Backend is running!"})

@app.route('/api/data', methods=['POST'])
def receive_data():
    """
    Example endpoint to receive data from the frontend CloudRunForm.
    """
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400

    data = request.get_json()
    email = data.get('email')
    feedback = data.get('feedback')

    if not email or not feedback:
        return jsonify({"error": "Missing 'email' or 'feedback' in request body"}), 400

    print(f"Received data: Email={email}, Feedback={feedback}")

    # --- Placeholder Database Interactions ---

    # # Example: Insert into PostgreSQL
    # conn = get_postgres_conn()
    # if conn:
    #     try:
    #         with conn.cursor() as cur:
    #             cur.execute(
    #                 "INSERT INTO feedback (email, feedback_text, received_at) VALUES (%s, %s, NOW())",
    #                 (email, feedback)
    #             )
    #             conn.commit()
    #             print("Data inserted into PostgreSQL.")
    #     except Exception as e:
    #         print(f"PostgreSQL insert error: {e}")
    #         conn.rollback() # Rollback transaction on error
    #         # Consider returning an error response to the frontend
    #     finally:
    #         conn.close()

    # # Example: Insert into BigQuery
    # if bq_client:
    #     try:
    #         table_ref = bq_client.dataset(BQ_DATASET_ID).table(BQ_TABLE_ID)
    #         rows_to_insert = [
    #             {"email": email, "feedback": feedback, "timestamp": datetime.datetime.utcnow()}
    #         ]
    #         errors = bq_client.insert_rows_json(table_ref, rows_to_insert)
    #         if not errors:
    #             print("Data inserted into BigQuery.")
    #         else:
    #             print(f"BigQuery insert errors: {errors}")
    #             # Consider returning an error response
    #     except Exception as e:
    #         print(f"BigQuery insert error: {e}")
    #         # Consider returning an error response

    # --- Response ---
    # Send a success response back to the frontend
    return jsonify({
        "message": "Data received successfully by backend!",
        "received_email": email # Echo back some data as confirmation
        }), 200


# --- Example Stripe Endpoint (Placeholder) ---
# @app.route('/api/create-payment-intent', methods=['POST'])
# def create_payment():
#     if not request.is_json:
#         return jsonify({"error": "Request must be JSON"}), 400
#     if not stripe.api_key:
#          return jsonify({"error": "Stripe is not configured on the server."}), 500

#     try:
#         data = request.get_json()
#         # You'll need to determine the amount server-side based on items, etc.
#         # Never trust the amount sent directly from the client for the final charge.
#         # Example: Calculate amount based on items in data['items']
#         calculated_amount = 1000 # Example: $10.00 in cents

#         intent = stripe.PaymentIntent.create(
#             amount=calculated_amount,
#             currency='usd',
#             # Add other options like customer ID, metadata, etc.
#             # automatic_payment_methods={"enabled": True}, # Recommended
#         )
#         return jsonify({
#             'clientSecret': intent.client_secret
#         })
#     except Exception as e:
#         print(f"Stripe PaymentIntent creation error: {e}")
#         return jsonify(error=str(e)), 403


# --- Example Firebase Admin Endpoint (Placeholder) ---
# @app.route('/api/set-admin-claim', methods=['POST'])
# def set_admin():
#     # IMPORTANT: Protect this endpoint! Ensure only authorized users can call it.
#     # You might verify an ID token passed in the request header.
#     # id_token = request.headers.get('Authorization', '').split('Bearer ')[1]
#     # try:
#     #     decoded_token = firebase_auth.verify_id_token(id_token)
#     #     caller_uid = decoded_token['uid']
#     #     # Check if caller_uid is authorized to perform this action
#     # except Exception as e:
#     #     return jsonify({"error": "Unauthorized"}), 401

#     if not request.is_json:
#         return jsonify({"error": "Request must be JSON"}), 400

#     data = request.get_json()
#     target_uid = data.get('uid')
#     if not target_uid:
#         return jsonify({"error": "Missing 'uid' in request body"}), 400

#     try:
#         # Set custom user claims
#         firebase_auth.set_custom_user_claims(target_uid, {'admin': True})
#         print(f"Admin claim set for user: {target_uid}")
#         return jsonify({"message": f"Admin claim set for user {target_uid}"}), 200
#     except Exception as e:
#         print(f"Error setting custom claim: {e}")
#         return jsonify({"error": f"Failed to set claim: {e}"}), 500


# --- Main Execution ---
if __name__ == '__main__':
    # Gunicorn or Cloud Run will set the PORT environment variable
    port = int(os.environ.get('PORT', 8080))
    # Run Flask's development server (for local testing only)
    # Use Gunicorn in production (as specified in Dockerfile CMD)
    app.run(debug=True, host='0.0.0.0', port=port)

