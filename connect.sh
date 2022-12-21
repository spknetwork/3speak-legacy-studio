ssh -L 11211:localhost:11211 ubuntu@185.130.44.185 -fN -o ServerAliveInterval=30 &
ssh -L 27019:localhost:27017 ubuntu@185.130.44.173  -fN -o ServerAliveInterval=30
export MONGO_HOST="localhost"
export ENV="dev"