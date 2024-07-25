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
from django.utils.crypto import get_random_string
from django.contrib.auth import login as auth_login, authenticate
from django.contrib.auth.hashers import make_password, check_password
from django.core.mail import send_mail

import json
from datetime import datetime

# log configuration
logging.basicConfig(level=logging.DEBUG)

# configure the mongodb connection 
client = MongoClient(settings.MONGO_URI)
db = client[settings.MONGO_DB_NAME]

###########  API for signup/_layout.tsx

@csrf_exempt
def signup(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        email = data['email']
        password = data['password']
        confirm_password = data['confirmPassword']

        if password != confirm_password:
            return JsonResponse({'error': 'Passwords do not match'}, status=400)

        user_collection = db.users
        if user_collection.find_one({"email": email}):
            return JsonResponse({'error': 'Email already in use'}, status=400)

        hashed_password = make_password(password)
        user_uid = get_random_string(length=32)
        user_data = {
            "display_name": "", 
            "email": email,
            "phone": "",  
            "created_date": datetime.utcnow(),
            "last_sign_in": None,
            "user_uid": user_uid,
            "password": hashed_password
        }
        user_collection.insert_one(user_data)
        return JsonResponse({'success': 'User created'}, status=201)
    
    return JsonResponse({'error': 'Invalid request method'}, status=400)


@csrf_exempt
def login(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        email = data['email']
        password = data['password']

        user_collection = db.users
        user = user_collection.find_one({"email": email})

        if user and check_password(password, user['password']):
            user_collection.update_one({"email": email}, {"$set": {"last_sign_in": datetime.utcnow()}})
            
            # Authenticate user with Django's authentication system
            user = authenticate(request, username=email, password=password)
            if user is not None:
                auth_login(request, user)  # Log user in
                return JsonResponse({'success': 'Login successful'}, status=200)
            else:
                return JsonResponse({'error': 'Invalid credentials'}, status=400)
        
        return JsonResponse({'error': 'Invalid credentials'}, status=400)

    return JsonResponse({'error': 'Invalid request method'}, status=400)

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