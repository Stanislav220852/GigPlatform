import bcrypt
import jwt 
from datetime import datetime, timedelta, timezone
from src.core.config import settings
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="users/login")


def hash_password(password: str) -> str:
    
    pwd_bytes = password.encode('utf-8')
    
    salt = bcrypt.gensalt()
   
    hashed = bcrypt.hashpw(pwd_bytes, salt)
   
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    
    password_bytes = plain_password.encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8')
  
    return bcrypt.checkpw(password_bytes, hashed_bytes)



def create_access_token(data: dict)-> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt