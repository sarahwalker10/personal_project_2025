import string
import random
from datetime import datetime
from flask import *
from functools import wraps
import sqlite3


app = Flask(__name__)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

def get_db():
    db = getattr(g, '_database', None)

    if db is None:
        db = g._database = sqlite3.connect('db/belay.sqlite3')
        db.row_factory = sqlite3.Row
        setattr(g, '_database', db)
    return db

def query_db(query, args=(), one=False):
    db = get_db()
    cursor = db.execute(query, args)
    rows = cursor.fetchall()
    db.commit()
    cursor.close()
    if rows:
        if one: 
            return rows[0]
        return rows
    return None


@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()


@app.route('/')
@app.route('/profile')
@app.route('/login')
@app.route('/channels')
@app.route('/threads')
def index(chat_id=None):
    return app.send_static_file('index.html')



# def index(chat_id=None):
#     return app.send_static_file('index.html')

if __name__ == '__main__':
    app.run()

@app.errorhandler(404)
def page_not_found(e):
    return 404


def new_user():
    name = "User #" + ''.join(random.choices(string.digits, k=6))
    password = ''.join(random.choices(string.ascii_lowercase + string.digits, k=10))
    api_key = ''.join(random.choices(string.ascii_lowercase + string.digits, k=40))
    u = query_db('insert into users (username, password, api_key) ' + 
        'values (?, ?, ?) returning user_id, username, password, api_key',
        (name, password, api_key),
        one=True)
    return u

#POST a new user account in the database when the user signs up
@app.route('/api/', methods = ["POST"])
def signup():
    u = new_user()
    user_dict = {}
    user_dict["user_api"] = u["api_key"]
    user_dict["user_name"] = u["username"]
    user_dict["user_id"] = u["user_id"]
    
    return jsonify([user_dict])


# GET to get the user account from login
# POST a new user account when the user clicks to create a new one
@app.route('/api/login', methods = ["GET", "POST"])
def login():
    if request.method == "GET":
        #get the username
        user = request.headers.get('username')
        #get the password
        pw = request.headers.get('password')
        print(user, pw)
        query = "SELECT * FROM users WHERE username = ? and password=?"
        rows = query_db(query, [user, pw])
        print(rows)
        if rows is None:
            error_user = [{"user_id": None, "user_api_key": None}]
            return jsonify(error_user)
        
        else:
            user = []
            for row in rows:
                row_dict = {}

                if isinstance(row["api_key"], bytes):
                    user_api_key = row["api_key"].decode('utf-8')
                else:
                    user_api_key = row["api_key"]

                if isinstance(row["user_id"], bytes):
                    user_id = row["user_id"].decode('utf-8')
                else:
                    user_id = row["user_id"]
            
                row_dict["user_id"] = user_id
                row_dict["user_api_key"] = user_api_key

                user.append(row_dict)
            return jsonify(user)
        
    if request.method == 'POST':
        u = new_user()
        user_dict = {}
        user_dict["user_api"] = u["api_key"]
        user_dict["user_name"] = u["username"]
        user_dict["user_id"] = u["user_id"]
        
        return jsonify([user_dict])


# POST to change the user's name
# POST to change the user's password
@app.route('/api/profile', methods = ["POST"])
def update_profile():
    #get the infromation sent in the script.js request 
    api_key = request.headers.get('auth-key')
    print(api_key)
    user_name = request.headers.get('username')
    print(user_name)
    update_type = request.headers.get('update-type')

    #update username in the db
    if update_type == "username":
        db = get_db()
        cursor = db.execute("UPDATE users SET username = ? WHERE api_key = ?", [user_name, api_key])
        db.commit()
        cursor.close()
        return jsonify({})
    #update password in the db
    elif update_type == "password":
        new_pw = request.headers.get('new-pw')
        print(new_pw)
        db = get_db()
        cursor = db.execute("UPDATE users SET password = ? WHERE api_key = ? and username = ?", [new_pw, api_key, user_name])
        db.commit()
        cursor.close()
        return jsonify({})


#POST a new channel, or a new message, or a reaction
#GET a list of channels, or a list of messages
@app.route('/api/channels', methods = ["POST", "GET"])
def twoColumnPage():   
    if request.method == "POST":
        if request.headers.get('post-type') == "channel":
            new_channel = request.headers.get('new-name')
            print(new_channel)
            #save the new message into the database
            db = get_db()
            cursor = db.execute("INSERT INTO channels (channel_name) VALUES (?)", [new_channel])
            db.commit()
            cursor.close()
            return {}
        if request.headers.get('post-type') == "message":
            user_id = request.headers.get('user-id')
            channel_id = request.headers.get('channel-id')
            time_entered = str(datetime.now().isoformat())
            #get the text body
            body_with_quotations = request.data.decode("utf-8")
            body_text = body_with_quotations[1:len(body_with_quotations)-1]
            #save the new message into the database
            db = get_db()
            cursor = db.execute("INSERT INTO messages \
                                (is_reply, user_id, channel_id, body, time_entered) \
                                VALUES (?, ?, ?, ?, ?)", [0, user_id, channel_id, body_text, time_entered])
            db.commit()
            cursor.close()
            return {}
            #I need to get the chat id working 
        if request.headers.get('post-type') == "reaction":
            emoji = request.headers.get('emoji')
            user = request.headers.get('user-id')
            message_id = request.headers.get('message-id')
            db = get_db()
            cursor = db.execute("INSERT INTO reactions (emoji, message_id, user_id) VALUES (?, ?, ?)", [emoji, message_id, user])
            db.commit()
            cursor.close()
            return {}

    elif request.method == "GET":
        if request.headers.get("get-type") == "list-channels":
            current_channel = request.headers.get("current-channel")
            user_id = request.headers.get("user-id")
            channels_list = query_db("SELECT * FROM channels")
            if channels_list is None:
                return jsonify({})
            
            list_of_channels = []
            for row in channels_list:
                row_dict = {}

                if isinstance(row["channel_id"], bytes):
                    channel_id = row["channel_id"].decode('utf-8')
                else:
                    channel_id = row["channel_id"]

                if isinstance(row["channel_name"], bytes):
                    channel_name = row["channel_name"].decode('utf-8')
                else:
                    channel_name = row["channel_name"]

                row_dict["channel_id"] = channel_id
                if channel_id == current_channel:
                    row_dict["unread"] = 0
                else:
                    row_dict["unread"] = num_messages_unread(channel_id, user_id, current_channel)
                row_dict["channel_name"] = channel_name  
                list_of_channels.append(row_dict)

            return jsonify(list_of_channels)

        if request.headers.get("get-type") == "list-messages":
            channel_id = request.headers.get("channel-id")
            q = "SELECT * FROM messages LEFT JOIN users ON \
            messages.user_id = users.user_id WHERE messages.channel_id= ? and messages.is_reply=?"
            messages_rows = query_db(q, [channel_id, 0])
            
            if messages_rows is None:
                return jsonify({})

            list_of_messages = []
            for row in messages_rows:
                row_dict = {}

                #query for the reactions for this message
                chat_id = int(row["id"])
                message_reactions = query_db("SELECT * FROM reactions WHERE message_id = ?", [chat_id])
                reaction_dictionary = create_reaction_dictionary()
                if message_reactions is not None:
                    for r in message_reactions:
                        emoji = r["emoji"]
                        reaction_dictionary[emoji] +=1
                        #here I would need to add something about the user who made the reaction
                row_dict["hearts"] = reaction_dictionary["hearts"]
                row_dict["laughing"] = reaction_dictionary["laughing"]
                row_dict["thumbsup"] = reaction_dictionary["thumbsup"]
                row_dict["thumbsdown"] = reaction_dictionary["thumbsdown"]
                row_dict["happyface"] = reaction_dictionary["happyface"]
                row_dict["star"] = reaction_dictionary["star"]

                #query for the number of replies to this message
                message_replies = query_db("SELECT * FROM messages WHERE chat_id = ? and is_reply =?", [row["id"], 1])
                if message_replies is None:
                    num_replies = 0
                else:
                    num_replies = len(message_replies)
                row_dict["num_replies"] = num_replies

                if isinstance(row["username"], bytes):
                    username = row["username"].decode('utf-8')
                else:
                    username = row["username"]

                if isinstance(row["id"], bytes):
                    message_id = row["id"].decode('utf-8')
                else:
                    message_id = row["id"]

                if isinstance(row["body"], bytes):
                    body = row["body"].decode('utf-8')
                else:
                    body = row["body"]

                row_dict["author"] = username
                row_dict["message_id"] = message_id
                row_dict["body"] = body
                row_dict["img_src"] = ""
                #here I would need to include images 

                list_of_messages.append(row_dict)

            return jsonify(list_of_messages)



#GET list of channels
#POST a new channel
@app.route('/api/threads', methods = ["POST", "GET"])
def threeColumnPage():   
    if request.method == "POST":
        if request.headers.get('post-type') == "channel":
            new_channel = request.headers.get('new-name')
            print(new_channel)
            #save the new message into the database
            db = get_db()
            cursor = db.execute("INSERT INTO channels (channel_name) VALUES (?)", [new_channel])
            db.commit()
            cursor.close()
            return {}
        if request.headers.get('post-type') == "message":
            user_id = request.headers.get('user-id')
            channel_id = request.headers.get('channel-id')
            time_entered = str(datetime.now().isoformat())
            #get the text body
            body_with_quotations = request.data.decode("utf-8")
            body_text = body_with_quotations[1:len(body_with_quotations)-1]
            #save the new message into the database
            db = get_db()
            cursor = db.execute("INSERT INTO messages \
                                (is_reply, user_id, channel_id, body, time_entered) \
                                VALUES (?, ?, ?, ?, ?)", [0, user_id, channel_id, body_text, time_entered])
            db.commit()
            cursor.close()
            return {}
        if request.headers.get('post-type') == "reaction":
            emoji = request.headers.get('emoji')
            user = request.headers.get('user-id')
            message_id = request.headers.get('message-id')
            db = get_db()
            cursor = db.execute("INSERT INTO reactions (emoji, message_id, user_id) VALUES (?, ?, ?)", [emoji, message_id, user])
            db.commit()
            cursor.close()
            return {}
        if request.headers.get('post-type') == "reply":
            user_id = request.headers.get('user-id')
            channel_id = request.headers.get('channel-id')
            chat_id = request.headers.get('message-id')
            time_entered = str(datetime.now().isoformat())
            #get the text body
            body_with_quotations = request.data.decode("utf-8")
            body_text = body_with_quotations[1:len(body_with_quotations)-1]
            #save the new message into the database
            db = get_db()
            cursor = db.execute("INSERT INTO messages \
                                (chat_id, is_reply, user_id, channel_id, body, time_entered) \
                                VALUES (?, ?, ?, ?, ?, ?)", [chat_id, 1, user_id, channel_id, body_text, time_entered])
            db.commit()
            cursor.close()
            return {}
    elif request.method == "GET":
        if request.headers.get("get-type") == "list-channels":
            channels_list = query_db("SELECT * FROM channels")
            if channels_list is None:
                return jsonify({})
            
            list_of_channels = []
            for row in channels_list:
                row_dict = {}

                if isinstance(row["channel_id"], bytes):
                    channel_id = row["channel_id"].decode('utf-8')
                else:
                    channel_id = row["channel_id"]

                if isinstance(row["channel_name"], bytes):
                    channel_name = row["channel_name"].decode('utf-8')
                else:
                    channel_name = row["channel_name"]

                row_dict["channel_id"] = channel_id
                row_dict["channel_name"] = channel_name

                list_of_channels.append(row_dict)
            return jsonify(list_of_channels)

        if request.headers.get("get-type") == "list-messages":
            channel_id = request.headers.get("channel-id")
            q = "SELECT * FROM messages LEFT JOIN users ON \
            messages.user_id = users.user_id WHERE messages.channel_id= ? and messages.is_reply=?"
            messages_rows = query_db(q, [channel_id, 0])
            
            if messages_rows is None:
                return jsonify({})

            list_of_messages = []
            for row in messages_rows:
                row_dict = {}

                #query for the reactions for this message
                chat_id = int(row["id"])
                message_reactions = query_db("SELECT * FROM reactions WHERE message_id = ?", [chat_id])
                reaction_dictionary = create_reaction_dictionary()
                if message_reactions is not None:
                    for r in message_reactions:
                        emoji = r["emoji"]
                        reaction_dictionary[emoji] +=1
                        #here I would need to add something about the user who made the reaction
                row_dict["hearts"] = reaction_dictionary["hearts"]
                row_dict["laughing"] = reaction_dictionary["laughing"]
                row_dict["thumbsup"] = reaction_dictionary["thumbsup"]
                row_dict["thumbsdown"] = reaction_dictionary["thumbsdown"]
                row_dict["happyface"] = reaction_dictionary["happyface"]
                row_dict["star"] = reaction_dictionary["star"]

                #query for the number of replies to this message
                message_replies = query_db("SELECT * FROM messages WHERE chat_id = ? and is_reply =?", [row["id"], 1])
                if message_replies is None:
                    num_replies = 0
                else:
                    num_replies = len(message_replies)
                row_dict["num_replies"] = num_replies

                if isinstance(row["username"], bytes):
                    username = row["username"].decode('utf-8')
                else:
                    username = row["username"]

                if isinstance(row["id"], bytes):
                    message_id = row["id"].decode('utf-8')
                else:
                    message_id = row["id"]

                if isinstance(row["body"], bytes):
                    body = row["body"].decode('utf-8')
                else:
                    body = row["body"]

                row_dict["author"] = username
                row_dict["message_id"] = message_id
                row_dict["body"] = body
                row_dict["img_src"] = ""
                #here I would need to include images 

                list_of_messages.append(row_dict)

            return jsonify(list_of_messages)

        if request.headers.get("get-type") == "list-threads":
            channel_id = request.headers.get("channel-id")
            chat_id = request.headers.get("chat-id")
            q = "SELECT * FROM messages LEFT JOIN users ON \
            messages.user_id = users.user_id WHERE messages.channel_id= ? and messages.is_reply=? and messages.chat_id =?"
            messages_rows = query_db(q, [channel_id, 1, chat_id])
            
            if messages_rows is None:
                return jsonify({})

            list_of_messages = []
            for row in messages_rows:
                row_dict = {}

                #query for the reactions for this message
                message_id = int(row["id"])
                message_reactions = query_db("SELECT * FROM reactions WHERE message_id = ?", [message_id])
                reaction_dictionary = create_reaction_dictionary()
                if message_reactions is not None:
                    for r in message_reactions:
                        emoji = r["emoji"]
                        reaction_dictionary[emoji] +=1
                        #here I would need to add something about the user who made the reaction
                row_dict["hearts"] = reaction_dictionary["hearts"]
                row_dict["laughing"] = reaction_dictionary["laughing"]
                row_dict["thumbsup"] = reaction_dictionary["thumbsup"]
                row_dict["thumbsdown"] = reaction_dictionary["thumbsdown"]
                row_dict["happyface"] = reaction_dictionary["happyface"]
                row_dict["star"] = reaction_dictionary["star"]

                #query for the number of replies to this message

                if isinstance(row["username"], bytes):
                    username = row["username"].decode('utf-8')
                else:
                    username = row["username"]

                if isinstance(row["id"], bytes):
                    message_id = row["id"].decode('utf-8')
                else:
                    message_id = row["id"]

                if isinstance(row["body"], bytes):
                    body = row["body"].decode('utf-8')
                else:
                    body = row["body"]

                row_dict["author"] = username
                row_dict["message_id"] = message_id
                row_dict["body"] = body
                row_dict["img_src"] = ""
                #here I would need to include images 

                list_of_messages.append(row_dict)

            return jsonify(list_of_messages)
        
        if request.headers.get("get-type") == "header_message":
            channel_id = request.headers.get("channel-id")
            id = request.headers.get("chat-id")
            q = "SELECT * FROM messages LEFT JOIN users ON \
            messages.user_id = users.user_id WHERE messages.channel_id= ? and messages.is_reply=? and messages.id =?"
            messages_rows = query_db(q, [channel_id, 0, id])
            
            if messages_rows is None:
                return jsonify({})

            list_of_messages = []
            for row in messages_rows:
                row_dict = {}

                #query for the reactions for this message
                chat_id = int(row["id"])
                message_reactions = query_db("SELECT * FROM reactions WHERE message_id = ?", [chat_id])
                reaction_dictionary = create_reaction_dictionary()
                if message_reactions is not None:
                    for r in message_reactions:
                        emoji = r["emoji"]
                        reaction_dictionary[emoji] +=1
                        #here I would need to add something about the user who made the reaction
                row_dict["hearts"] = reaction_dictionary["hearts"]
                row_dict["laughing"] = reaction_dictionary["laughing"]
                row_dict["thumbsup"] = reaction_dictionary["thumbsup"]
                row_dict["thumbsdown"] = reaction_dictionary["thumbsdown"]
                row_dict["happyface"] = reaction_dictionary["happyface"]
                row_dict["star"] = reaction_dictionary["star"]

                if isinstance(row["username"], bytes):
                    username = row["username"].decode('utf-8')
                else:
                    username = row["username"]

                if isinstance(row["id"], bytes):
                    message_id = row["id"].decode('utf-8')
                else:
                    message_id = row["id"]

                if isinstance(row["body"], bytes):
                    body = row["body"].decode('utf-8')
                else:
                    body = row["body"]

                row_dict["author"] = username
                row_dict["message_id"] = message_id
                row_dict["body"] = body
                row_dict["img_src"] = ""
                #here I would need to include images 

                list_of_messages.append(row_dict)

            return jsonify(list_of_messages)

def create_reaction_dictionary():
    '''
    preprocess the dictionary to store the count of all the reactions 
    '''
    return {
        "hearts": 0,
        "thumbsup": 0,
        "happyface": 0,
        "laughing": 0,
        "star":0,
        "thumbsdown":0   
    }



def num_messages_unread(channel_id, user_id, current_channel):
    '''
    get the number of unread messages in a channel for the user 
    '''
    if channel_id == current_channel:
        # return 0
        return "0"
    else:
       #need to use my join table
        return "#"
        






