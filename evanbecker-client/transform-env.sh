echo "Trying to push to .env.local"

[ ! -z "$SITE_URL" ] > .env.local && echo -e "NEXT_PUBLIC_SITE_URL=$SITE_URL" >> .env.local
[ ! -z "$AUTH0_DOMAIN" ] echo -e "AUTH0_DOMAIN=$AUTH0_DOMAIN" >> .env.local
[ ! -z "$AUTH0_CLIENT_ID" ] echo -e "AUTH0_CLIENT_ID=$AUTH0_CLIENT_ID" >> .env.local
[ ! -z "$AUTH0_AUDIENCE" ] echo -e "AUTH0_AUDIENCE=$AUTH0_AUDIENCE" >> .env.local
[ ! -z "$AUTH0_REDIRECT_URI" ] echo -e "AUTH0_REDIRECT_URI=$AUTH0_REDIRECT_URI" >> .env.local