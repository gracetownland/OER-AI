import json
import os
import zipfile
import base64
from pathlib import Path
from io import BytesIO
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def handler(event, context):
    """
    Lambda handler for H5P export
    Accepts question set JSON, generates .h5p file, returns as base64
    """
    try:
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        questions = body.get('questions', [])
        title = body.get('title', 'Generated Quiz')
        
        if not questions:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({'error': 'No questions provided'})
            }
        
        logger.info(f"Generating H5P package for '{title}' with {len(questions)} questions")
        
        # Generate H5P package (returns bytes)
        h5p_bytes = create_h5p_package(questions, title)
        
        # Encode as base64
        h5p_base64 = base64.b64encode(h5p_bytes).decode('utf-8')
        
        logger.info(f"H5P package created successfully, size: {len(h5p_bytes)} bytes")
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': '*',
                'Access-Control-Allow-Methods': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'filename': f"{title.replace(' ', '_')}.h5p",
                'content': h5p_base64,
                'size': len(h5p_bytes)
            })
        }
        
    except Exception as e:
        logger.error(f"Error generating H5P: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({'error': f'Failed to generate H5P: {str(e)}'})
        }


def create_h5p_package(questions, title):
    """
    Create H5P package from question data
    Returns bytes of the .h5p file
    """
    # Create temp directory in Lambda's /tmp
    import time
    work_dir = Path(f"/tmp/h5p_{int(time.time() * 1000)}")
    content_dir = work_dir / "content"
    content_dir.mkdir(parents=True, exist_ok=True)
    
    try:
        # Build content.json
        if len(questions) == 1:
            # Single question format
            q = questions[0]
            content_data = {
                "question": q["params"]["question"],
                "answers": q["params"]["answers"],
                "behaviour": {
                    "enableRetry": True,
                    "enableSolutionsButton": True,
                    "singlePoint": True,
                    "randomAnswers": True
                },
                "l10n": {
                    "checkAnswer": "Check",
                    "showSolution": "Show solution",
                    "retry": "Try again"
                }
            }
        else:
            # Multiple questions - use QuestionSet
            question_set = []
            for q in questions:
                question_set.append({
                    "library": "H5P.MultiChoice 1.16",
                    "params": q["params"]
                })
            content_data = {
                "introduction": f"<p>{title}</p>",
                "questions": question_set,
                "behaviour": {
                    "enableRetry": True,
                    "enableSolutionsButton": True
                },
                "overallFeedback": [
                    {"from": 0, "to": 100, "feedback": "Good job!"}
                ]
            }
        
        with open(content_dir / "content.json", "w") as f:
            json.dump(content_data, f, indent=2)
        
        # Build h5p.json (metadata)
        h5p_data = {
            "title": title,
            "language": "en",
            "mainLibrary": "H5P.MultiChoice" if len(questions) == 1 else "H5P.QuestionSet",
            "embedTypes": ["div"],
            "license": "CC BY",
            "authors": [{"name": "OER-AI Assistant", "role": "Author"}],
            "preloadedDependencies": [
                {
                    "machineName": "H5P.MultiChoice",
                    "majorVersion": 1,
                    "minorVersion": 16
                }
            ]
        }
        with open(work_dir / "h5p.json", "w") as f:
            json.dump(h5p_data, f, indent=2)
        
        # Build library.json
        library_data = {
            "machineName": "H5P.MultiChoice",
            "title": "Multiple Choice",
            "majorVersion": 1,
            "minorVersion": 16,
            "patchVersion": 0,
            "runnable": 1
        }
        with open(work_dir / "library.json", "w") as f:
            json.dump(library_data, f, indent=2)
        
        # Create ZIP file in memory
        zip_buffer = BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as h5p_zip:
            for root, _, files in os.walk(work_dir):
                for file in files:
                    full_path = os.path.join(root, file)
                    arcname = os.path.relpath(full_path, work_dir)
                    h5p_zip.write(full_path, arcname)
        
        # Get bytes
        h5p_bytes = zip_buffer.getvalue()
        
        return h5p_bytes
        
    finally:
        # Cleanup temp directory
        import shutil
        if work_dir.exists():
            shutil.rmtree(work_dir)
