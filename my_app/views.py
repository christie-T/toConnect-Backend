import logging
import jwt

from django.http import HttpResponse, JsonResponse
from django.shortcuts import render, redirect

from pymongo import MongoClient

from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.decorators import api_view

from bson.objectid import ObjectId

from djangoBackend import settings
from djangoBackend.mongodb import db
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.contrib.sessions.models import Session
from django.utils.crypto import get_random_string
from django.contrib.auth import authenticate, login
from django.contrib.auth.hashers import make_password, check_password
from django.core.mail import send_mail

import json
from datetime import datetime

# log configuration
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.DEBUG)

# configure the mongodb connection 
client = MongoClient(settings.MONGO_URI)
db = client[settings.MONGO_DB_NAME]

# session debug
from django.contrib.sessions.models import Session

def check_sessions_view(request):
    sessions = Session.objects.all()
    response_data = []
    for session in sessions:
        session_data = f'Session: {session.session_key}, Data: {session.get_decoded()}'
        response_data.append(session_data)
    
    return HttpResponse('<br>'.join(response_data))


###########  API for signup/_layout.tsx

@csrf_exempt
def signup(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            email = data.get('email')
            password = data.get('password')
            confirm_password = data.get('confirmPassword')

            logger.debug(f'Received signup request with email: {email}')

            # passwords match?
            if password != confirm_password:
                logger.warning('Passwords do not match')
                return JsonResponse({'error': 'Passwords do not match'}, status=400)

            # check if email already exists
            if User.objects.filter(email=email).exists():
                logger.warning('Email already exists')
                return JsonResponse({'error': 'Email already exists'}, status=400)

            # create the user, user session
            user = User.objects.create_user(username=email, email=email, password=password)

            # log the user in with Django auth
            login(request, user)

            # retrieve the session key
            session_key = request.session.session_key
            logger.info(f'Successfully created and logged in user with session_key: {session_key}')

            # return the success response along with session key
            return JsonResponse({'message': 'User created and logged in successfully', 'session_key': session_key}, status=201)
        
        except Exception as e:
            logger.error(f'Error occurred: {str(e)}')
            return JsonResponse({'error': str(e)}, status=400)

    return JsonResponse({'error': 'Invalid request method'}, status=405)

@csrf_exempt
def signin(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            email = data.get('email')
            password = data.get('password')

            # authenticate the user
            user = authenticate(request, username=email, password=password)

            if user is not None:
                # log in the user, create a session
                login(request, user)
                return JsonResponse({'message': 'Login successful'}, status=200)
            else:
                return JsonResponse({'error': 'Invalid email or password'}, status=400)

        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

    # 
    if request.method == 'GET':
        return JsonResponse({'message': 'Please send a POST request with email and password'}, status=400)

###########  API for setup/name/_layout.tsx  

@csrf_exempt
def get_profile(request):
    if request.method == 'GET':
        user_id = request.user.id
        profile_collection = db.profiles
        profile = profile_collection.find_one({"id": user_id})

        if profile:
            return JsonResponse(profile, status=200)
        else:
            return JsonResponse({'error': 'Profile not found'}, status=404)

    return JsonResponse({'error': 'Invalid request method'}, status=400)

@csrf_exempt
def update_profile(request):
    logger.debug("Entered update_profile view")

    if not request.user.is_authenticated:
        logger.debug("User is not authenticated")
        return JsonResponse({'error': 'User is not authenticated'}, status=401)

    if request.method == 'POST':
        logger.debug("Processing POST request")
        try:
            data = json.loads(request.body)
            logger.debug(f"Received data: {data}")

            user_id = request.user.id
            full_name = data.get('full_name')
            logger.debug(f"User ID: {user_id}, Full Name: {full_name}")

            if not full_name:
                logger.debug("Full name is missing")
                return JsonResponse({'error': 'Full name is required'}, status=400)

            profile_collection = db.profiles
            result = profile_collection.update_one(
                {"id": user_id},
                {"$set": {"full_name": full_name, "updated_at": datetime.utcnow()}},
                upsert=True
            )

            logger.debug(f"Update result: modified_count={result.modified_count}, upserted_id={result.upserted_id}")

            if result.modified_count > 0 or result.upserted_id:
                logger.debug("Profile updated successfully")
                return JsonResponse({'success': 'Profile updated'}, status=201)
            else:
                logger.debug("Failed to update profile")
                return JsonResponse({'error': 'Failed to update profile'}, status=500)
        
        except json.JSONDecodeError:
            logger.debug("Invalid JSON")
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            return JsonResponse({'error': str(e)}, status=500)

    logger.debug("Invalid request method")
    return JsonResponse({'error': 'Invalid request method'}, status=405)

###########  API for reportHide.tsx  

@api_view(['POST'])
def add_report(request):
    user = request.user
    if not user.is_authenticated:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    selected_post_id = request.data.get('selectedPostId')
    reason = request.data.get('reason')
    
    if not selected_post_id:
        return Response({'error': 'No post selected for reporting'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # check if post has already been reported
        reported_entry = db.reported.find_one({'post_id': selected_post_id})

        if reported_entry:
            # if the post was already reported, update the reasons list
            updated_reasons = reported_entry.get('reasons', []) + [reason]
            db.reported.update_one({'post_id': selected_post_id}, {'$set': {'reasons': updated_reasons}})
        else:
            # if the post was not reported, insert a new report entry
            db.reported.insert_one({'post_id': selected_post_id, 'reasons': [reason]})

        return Response({'message': 'Report submitted successfully'}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def handle_hide(request):
    print("Handle hide function called.")  # Debug statement

    user = request.user
   # if not user.is_authenticated:
        #return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    post_id = request.data.get('postId')
    if not post_id:
        return Response({'error': 'postId is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user_id = str(user.id)
        print(f"User ID: {user_id}, Post ID: {post_id}")  # Debug statement

        # Check if the user already exists in the blocked collection
        blocked_entry = db.blocked.find_one({'id': user_id})
        print(f"Blocked entry: {blocked_entry}")  # Debug statement

        if blocked_entry:
            # If the user exists, update the blocked_posts array using $push
            db.blocked.update_one(
                {'id': user_id},
                {'$push': {'blocked_posts': post_id}}
            )
            print("Updated existing entry.")  # Debug statement
        else:
            # If the user doesn't exist, insert a new entry with blocked_posts array
            db.blocked.insert_one({'id': user_id, 'blocked_posts': [post_id]})
            print("Inserted new entry.")  # Debug statement

        return Response({'message': 'Post successfully blocked'}, status=status.HTTP_200_OK)

    except Exception as e:
        print(f"Error in handle_hide: {e}")  # Debug statement
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    

