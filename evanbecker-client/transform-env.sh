touch .env.local
echo "here's current env:"
env
echo "Trying to push to .env.local"
echo -e "NEXT_PUBLIC_SITE_URL=${SITE_URL}" >> .env.local
echo "printing .env.local"
cat .env.local
pwd
ls -la