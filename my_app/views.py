import logging
import jwt

from django.http import HttpResponse, JsonResponse
from django.shortcuts import render, redirect

from pymongo import MongoClient

from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.decorators import api_view

from bson.objectid import ObjectId
from bson import Binary

from djangoBackend import settings
from djangoBackend.mongodb import db
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from django.contrib.sessions.models import Session
from django.utils.crypto import get_random_string
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, get_user_model, logout as auth_logout
from django.contrib.auth.hashers import make_password, check_password
from django.core.mail import send_mail
from django.utils.timezone import now

import json
from datetime import datetime
from uuid import UUID

# log configuration
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.DEBUG)

# configure the mongodb connection 
client = MongoClient(settings.MONGO_URI)
db = client[settings.MONGO_DB_NAME]

# session debug
from django.contrib.sessions.models import Session

# user customization
CustomUser = get_user_model()


def check_sessions_view(request):
    sessions = Session.objects.all()
    response_data = []
    for session in sessions:
        session_data = f'Session: {session.session_key}, Data: {session.get_decoded()}'
        response_data.append(session_data)
    
    return HttpResponse('<br>'.join(response_data))


###########  IMPORTANT: the following getProfile API is used in a lot of Front-End files

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

##########  API for signup/_layout.tsx

@csrf_exempt
def signup(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            email = data.get('email')
            password = data.get('password')
            confirm_password = data.get('confirmPassword')

            # check if passwords match
            if password != confirm_password:
                return JsonResponse({'error': 'Passwords do not match'}, status=400)

            # check if the email already exists
            if User.objects.filter(email=email).exists():
                return JsonResponse({'error': 'Email already exists'}, status=400)

            # creating the user (django)
            user = User.objects.create_user(username=email, email=email, password=password)

            # log user in with django auth
            login(request, user)

            # retrieve session key, 
            session_key = request.session.session_key
            user_id = user.id  # get UUID
            print(user_id)

            # insert user_id into mongodb in 'id' field 
            profile_collection = db.profiles 
            profile_collection.insert_one({
                "id": user_id, 
                "updated_at": datetime.utcnow().isoformat()
            })

            # return a success response with session key and user ID
            return JsonResponse({
                'message': 'User created and logged in successfully',
                'session_key': session_key,
                'user_id': str(user_id)
            }, status=201)
        
        except Exception as e:
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
def update_profile(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'User is not authenticated'}, status=401)

    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            user_id = request.user.id

            full_name = data.get('full_name')

            if not full_name:
                return JsonResponse({'error': 'Full name is required'}, status=400)

            profile_collection = db.profiles
          
            result = profile_collection.update_one(
                {"id": user_id},
                {"$set": {"full_name": full_name, "updated_at": datetime.utcnow()}},
                upsert=True
            )

            if result.modified_count > 0 or result.upserted_id:
                return JsonResponse({'success': 'Profile updated'}, status=201)
            else:
                return JsonResponse({'error': 'Failed to update profile'}, status=500)
        
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

    return JsonResponse({'error': 'Invalid request method'}, status=405)

###########  API for setup/image/_layout.tsx   

@login_required
def update_image(request):
    user = request.user
    avatar_url = request.POST.get('avatar_url')

    if not avatar_url:
        return JsonResponse({'error': 'avatar_url is required'}, status=400)

    profiles_collection = db.profiles
    result = profiles_collection.update_one(
        {'_id': ObjectId(user.id)},
        {'$set': {'avatar_url': avatar_url, 'updated_at': now()}}
    )

    if result.modified_count == 0:
        return JsonResponse({'error': 'Update failed'}, status=500)

    return JsonResponse({'message': 'Avatar updated successfully'}, status=200)


###########  API for setup/age/_layout.tsx    

@csrf_exempt
@login_required
def update_age(request):
    user = request.user
    age_range = request.POST.get('age_range')

    if not age_range:
        return JsonResponse({'error': 'age_range is required'}, status=400)

    profiles_collection = db.profiles
    result = profiles_collection.update_one(
        {'_id': ObjectId(user.id)},
        {'$set': {'age_range': age_range, 'updated_at': now()}}
    )

    if result.modified_count == 0:
        return JsonResponse({'error': 'Update failed'}, status=500)

    return JsonResponse({'message': 'Age range updated successfully'}, status=201)


###########  API for setup/interests/bio/_layout.tsx    

@login_required
def update_bio(request):
    user = request.user
    bio = request.POST.get('bio')

    if not bio:
        return JsonResponse({'error': 'bio is required'}, status=400)

    profiles_collection = db.profiles
    result = profiles_collection.update_one(
        {'_id': ObjectId(user.id)},
        {'$set': {'bio': bio}}
    )

    if result.modified_count == 0:
        return JsonResponse({'error': 'Update failed'}, status=500)

    return JsonResponse({'message': 'Bio updated successfully'}, status=200)


###########  API for setup/interests/location/_layout.tsx 

@login_required
def update_location(request):
    user = request.user
    location = request.POST.get('location')

    if not location:
        return JsonResponse({'error': 'Location is required'}, status=400)

    profiles_collection = db.profiles
    result = profiles_collection.update_one(
        {'_id': ObjectId(user.id)},
        {'$set': {'location': location, 'updated_at': now()}}
    )

    if result.modified_count == 0:
        return JsonResponse({'error': 'Update failed'}, status=500)

    return JsonResponse({'message': 'Location updated successfully'}, status=200)


###########  API for setup/interests/lookingFor/_layout.tsx 

@login_required
def update_column(request):
    user = request.user
    column = request.POST.get('column')
    value = request.POST.get('value')
    action = request.POST.get('action')  # 'add' or 'remove'

    if column not in ['interests', 'looking_for']:
        return JsonResponse({'error': 'Invalid column'}, status=400)

    profiles_collection = db.profiles
    profile = profiles_collection.find_one({'_id': ObjectId(user.id)})

    if not profile:
        return JsonResponse({'error': 'Profile not found'}, status=404)

    # update column based on add/remove
    if action == 'add':
        profiles_collection.update_one(
            {'_id': ObjectId(user.id)},
            {'$addToSet': {column: value}, '$set': {'updated_at': now()}}
        )
    elif action == 'remove':
        profiles_collection.update_one(
            {'_id': ObjectId(user.id)},
            {'$pull': {column: value}, '$set': {'updated_at': now()}}
        )
    else:
        return JsonResponse({'error': 'Invalid action'}, status=400)

    return JsonResponse({'message': f'{column} updated successfully'}, status=200)


###########  API for CreatePost/_layout.tsx  

@login_required
def get_fullname(request):
    user = request.user
    profiles_collection = db.profiles

    # fetch profile from MongoDB using the user's ID
    profile = profiles_collection.find_one({'_id': ObjectId(user.id)})

    if not profile:
        return JsonResponse({'error': 'Profile not found'}, status=404)

    data = {
        'full_name': profile.get('full_name'),
        'avatar_url': profile.get('avatar_url')
    }

    return JsonResponse(data, status=200)


@login_required
def create_post(request):
    user = request.user
    data = json.loads(request.body)
    title = data.get('title')
    location = data.get('location')
    description = data.get('description')
    date = data.get('date')

    if not title or not location or not description or not date:
        return JsonResponse({'error': 'All fields are required'}, status=400)

    profiles_collection = db.profiles
    profile = profiles_collection.find_one(
        {'_id': ObjectId(user.id)},
        {'full_name': 1, 'avatar_url': 1, '_id': 0}
    )

    if not profile:
        return JsonResponse({'error': 'User profile not found'}, status=404)

    posts_collection = db.posts
    result = posts_collection.insert_one({
        'user_id': ObjectId(user.id),
        'title': title,
        'location': location,
        'description': description,
        'date': date,
        'organizer': profile['full_name'],
        'avatar_url': profile['avatar_url']
    })

    if not result.inserted_id:
        return JsonResponse({'error': 'Failed to create post'}, status=500)

    return JsonResponse({'message': 'Post created successfully'}, status=201)


@login_required
def get_posts(request):
    user = request.user
    posts_collection = db.posts
    posts = list(posts_collection.find(
        {'user_id': ObjectId(user.id)},
        {'_id': 0}
    ))

    if not posts:
        return JsonResponse({'error': 'No posts found'}, status=404)

    return JsonResponse({'posts': posts}, status=200)


###########  API for goingList/_layout.tsx  

@login_required
def create_going(request, post_id):
    user = request.user        
    going_collection = db.going
    profiles_collection = db.profiles

    # fetch user's ID from profiles db // CAN PROB SIMPLIFY THIS by just accessing ObjectID(user.id) and storing that, haven't tested for this API yet though
    user_profile = profiles_collection.find_one({'_id': ObjectId(user.id)})

    if not user_profile:
        return JsonResponse({'error': 'User profile not found'}, status=404)

    # check if there's already an entry for the post
    existing_entry = going_collection.find_one({'post_id': ObjectId(post_id)})

    if existing_entry:
        # update going table by adding the user ID to the 'id' array if its not already there
        if user.id not in existing_entry.get('id', []):
            result = going_collection.update_one(
                {'post_id': ObjectId(post_id)},
                {'$push': {'id': str(user.id)}}
            )
            if result.modified_count == 0:
                return JsonResponse({'error': 'Failed to update going list'}, status=500)
            return JsonResponse({'message': 'Added to going list'}, status=200)
        else:
            return JsonResponse({'message': 'Already going to this post'}, status=200)
    else:
        # creates a new entry with the post id and adds the users id to 'id' field
        result = going_collection.insert_one({
            'post_id': ObjectId(post_id),
            'id': [str(user.id)]
        })

        if not result.inserted_id:
            return JsonResponse({'error': 'Failed to mark as going'}, status=500)

        return JsonResponse({'message': 'Marked as going'}, status=201)



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
    if not user.is_authenticated:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

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
    

###########  API for profile/_layout.tsx  (Account Inactive Flag)

@login_required
@require_http_methods(['POST'])
def remove_account(request):
    user_pk = request.user.pk
    
    # logout user
    auth_logout(request)
    
    # flag user as inactive
    User = get_user_model()
    User.objects.filter(pk=user_pk).update(is_active=False)
    
    # Return a success response
    return JsonResponse({'success': True, 'message': 'Account successfully deactivated.'})