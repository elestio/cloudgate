#Postfix server used to delived emails sent through cloudgate-cloudbackend

#Start Postfix as a docker service running on port 25 and only exposed to the host and other docker containers on 172.17.0.1 (docker0 interface)
#more settings are available here: https://github.com/bokysan/docker-postfix
docker run -d --name postfix -e "ALLOWED_SENDER_DOMAINS=example.com" -p 172.17.0.1:25:587 boky/postfix

#Note: this is great for testing, but for production you will need to address several things like to get your emails delivered not in spam
#Setting on your domain SPF, DKIM, reverse DNS of your IP ... 
#Another great option for production is to use AWS SES instead of this