#Postfix server used to delived emails sent through cloudgate-cloudbackend

#Find public IP (needed for SPF config)
publicIP=$(curl -s ipinfo.io/ip);

#Ask for domain (needed for DKIM)
read -p "Sender domain name [terasp.net]: " domain
domain=${domain:-terasp.net}
echo $domain

#force a domain
#domain="terasp.net";

#ensure dkim folder is created 
mkdir -p ./dkim
chmod 777 ./dkim/*

#cleanup previous instance
echo "Cleaning previous cloudgate-postfix instance..."
docker stop cloudgate-postfix
docker rm cloudgate-postfix

#Start Postfix as a docker service running on port 25 and only exposed to the host and other docker containers on 172.17.0.1 (docker0 interface)
#more settings are available here: https://github.com/bokysan/docker-postfix

##Allow all senders, No DKIM
#docker run -d --name cloudgate-postfix -e "ALLOW_EMPTY_SENDER_DOMAINS=1" -p 172.17.0.1:25:587 -e POSTFIX_myhostname=terasp.net boky/postfix

##Allow only permitted sender + DKIM
echo "Starting new cloudgate-postfix instance..."
docker run -d --name cloudgate-postfix -e "ALLOWED_SENDER_DOMAINS=${domain}" -e "DKIM_AUTOGENERATE=1" -v ${PWD}/dkim:/etc/opendkim/keys -p 172.17.0.1:25:587 -e POSTFIX_myhostname=${domain} boky/postfix

#Note: this is great for testing, but for production you will need to address several things like to get your emails delivered not in spam
#Setting on your domain SPF, DKIM, reverse DNS of your IP ... 
#Another great option for production is to use AWS SES instead of this


#Read DKIM Key
DKIMKey=`cat ./dkim/${domain}.txt`;
DKIMValue=`echo ${DKIMKey} | sed "s|mail._domainkey IN TXT ( \"||g"`
DKIMValue=`echo ${DKIMValue} | sed "s|\" ) ; ----- DKIM key mail for terasp.net||g"`
DKIMValue=`echo ${DKIMValue} | sed "s|\" \"||g"`
#echo $DKIMValue;


echo "";
echo "*******************************************************************************************"
echo "* IMPORTANT: To improve email deliverability you must configure SPF & DKIM on your domain *";
echo "*******************************************************************************************"
echo "SPF CONFIGURATION: Please create a TXT DNS entry on your root domain (@):";
echo "v=spf1 a mx ip4:${publicIP} ~all";
echo "*******************************************************************************************"
echo "DKIM CONFIGURATION: Please create a TXT DNS entry for mail._domainkey on your domain:";
echo $DKIMValue;
echo "*******************************************************************************************"
echo "RDNS: if supported by your DNS, configure reverse DNS on your IP address to point to:";
echo $domain;
echo "*******************************************************************************************"
echo "";