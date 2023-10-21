touch .env.local
echo "Trying to push to .env.local"
echo -e "NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}" >> .env.local
echo -e "AUTH0_DOMAIN=${AUTH0_DOMAIN}" >> .env.local
echo -e "AUTH0_CLIENT_ID=${AUTH0_CLIENT_ID}" >> .env.local
echo -e "AUTH0_AUDIENCE=${AUTH0_AUDIENCE}" >> .env.local
echo -e "AUTH0_REDIRECT_URI=${AUTH0_REDIRECT_URI}" >> .env.local