systemctl stop cloudgate
systemctl disable cloudgate
systemctl daemon-reload
rm /etc/systemd/system/cloudgate.service