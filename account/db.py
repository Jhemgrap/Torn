import motor.motor_asyncio
from utils import Hash
import bcrypt

MONGO_CONNECTION_STR = "mongodb://localhost:27017/torn"
# Connect to DB
client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_CONNECTION_STR)
db = client.torn
players = db.players

async def authenticate_player(username: str, password: str) -> bool:
    player = await players.find_one({"_id": username})

    # Player doesn't exist (or is dead)
    if (player == None or player['lives'] <= 0):
        return False

    passwd = player['password']

    if (isinstance(passwd, int)):
        passwd = str(passwd)
    
    password = password.encode('utf-8')
    passwd = passwd.encode('utf-8')

    if (bcrypt.checkpw(Hash.hontza_hash(password), passwd)):
        # Legacy account - bcrypt the password
        hash = Hash.bcrypt_hash(password)
        await players.update_one({"_id" : username}, { "$set": { "password" : hash}})
        return True
    elif bcrypt.checkpw(password, passwd):
        return True
    else:
        return False

async def change_password(username : str, new_password : str) -> bool:
    new_password = new_password.encode('utf-8')
    hash = Hash.bcrypt_hash(new_password)
    await players.update_one({"_id" : username}, { "$set": { "password" : hash}})

async def user_exists(username : str) -> bool:
    return await players.find_one({"_id":username}) != None

async def create_account(username : str, password : str) -> bool:
    password = password.encode('utf-8')
    if (await user_exists(username)):
        return False
    await players.insert_one({"_id" : username, "password": Hash.bcrypt_hash(password), "lives" : 20})
    return True