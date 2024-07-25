# djangoBackend/mongodb.py
from pymongo import MongoClient

# Replace with your MongoDB connection string
client = MongoClient("mongodb://localhost:27017/")
db = client['mydatabase']



















# import sys
# from django.conf import settings
# from pymongo import MongoClient

# client = MongoClient("mongodb://localhost:27017/")
# db = client['toConnect']

# class MongoConnection(object):
#     _instance = None

#     def __new__(cls):
#         if cls._instance is None:
#             host = settings.DATABASES['default'].get('HOST', 'localhost')
#             port = settings.DATABASES['default'].get('PORT', 27017)
#             db_name = settings.DATABASES['default']['NAME']
#             print('Opening mongodb connection on address %s:%s' % (host, port))
#             client = MongoClient(host, port)
#             cls._instance = super(MongoConnection, cls).__new__(cls)

#             cls._instance.database = client[db_name]
    
#         return cls._instance