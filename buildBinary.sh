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

mkdir -p ./binaries;
cd ./binaries;

#package cloudgate as binaries for win/osx/linux
pkg ../ --options max_old_space_size=4096 --targets node14-linux-x64,node14-win-x64,node14-macos-x64;

#Copy uWS binaries for Node 14
cp ../node_modules/uWebSockets.js/uws_win32_x64_83.node .
cp ../node_modules/uWebSockets.js/uws_darwin_x64_83.node .
cp ../node_modules/uWebSockets.js/uws_linux_x64_83.node .