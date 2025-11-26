import os, json
import boto3
from botocore.config import Config

BUCKET = os.environ["BUCKET"]
REGION = os.environ["REGION"]

s3 = boto3.client(
    "s3",
    endpoint_url=f"https://s3.{REGION}.amazonaws.com",
    config=Config(
        s3={"addressing_style": "virtual"}, region_name=REGION, signature_version="s3v4"
    ),
)

def lambda_handler(event, context):
    """
    Generate pre-signed URLs for uploading files to S3
    """
    query_params = event.get("queryStringParameters", {})

    if not query_params or not query_params.get("file_name"):
        return {
            'statusCode': 400,
            'headers': get_cors_headers(),
            'body': json.dumps({'error': 'Missing file_name parameter'})
        }

    file_name = query_params.get("file_name", "")
    content_type = query_params.get("content_type", "application/octet-stream")

    # Create key with timestamp to avoid collisions
    import time
    timestamp = int(time.time())
    key = f"uploads/{timestamp}_{file_name}"

    try:
        presigned_url = s3.generate_presigned_url(
            ClientMethod="put_object",
            Params={
                "Bucket": BUCKET, 
                "Key": key, 
                "ContentType": content_type
            },
            ExpiresIn=300,  # 5 minutes
            HttpMethod="PUT",
        )

        return {
            "statusCode": 200,
            "headers": get_cors_headers(),
            "body": json.dumps({
                "presignedUrl": presigned_url, 
                "key": key,
                "bucket": BUCKET
            }),
        }

    except Exception as e:
        print(f"Error generating presigned URL: {str(e)}")
        return {
            'statusCode': 500,
            'headers': get_cors_headers(),
            'body': json.dumps({'error': 'Failed to generate presigned URL'})
        }


def get_cors_headers():
    return {
        "Content-Type": "application/json",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "*",
    }
