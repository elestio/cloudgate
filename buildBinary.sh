if ! command -v node &> /dev/null
then
    echo "node is required to build, try: apt install nodejs"
    exit
fi

if ! command -v pkg &> /dev/null
then
    echo "Installing PKG"
    npm install -g pkg
fi

rm -rf /tmp/cloudgate/
mkdir -p /tmp/cloudgate/
cp -r * /tmp/cloudgate/
rm -rf /tmp/cloudgate/DB/
rm -rf /tmp/cloudgate/binaries/
rm -rf /tmp/cloudgate/benchmarks/
rm -rf /tmp/cloudgate/apps/CatchAll/CERTS/
rm -rf /tmp/cloudgate/node_modules/uWebSockets.js/*.node

rm -rf ./binaries/*
mkdir -p ./binaries;
cd ./binaries;

#package cloudgate as binaries for win/osx/linux
#pkg /tmp/cloudgate/ --options max_old_space_size=4096 --targets node14-linux-x64,node14-win-x64,node14-macos-x64;
pkg /tmp/cloudgate/ --options max_old_space_size=4096 --targets node14-linux-x64;

#Copy uWS binaries for Node 14
#cp ../node_modules/uWebSockets.js/uws_win32_x64_83.node .
#cp ../node_modules/uWebSockets.js/uws_darwin_x64_83.node .
cp ../node_modules/uWebSockets.js/uws_linux_x64_83.node .

#create tar.gz
tar -czvf cloudgate-linux.tar.gz cloudgate uws_linux_x64_83.node
