# 使用 Node.js 官方映像作為基礎映像
FROM node:18

# 設定工作目錄
WORKDIR /usr/src/app

# 複製 package.json 和 package-lock.json 到工作目錄
COPY package*.json ./

# 安裝項目依賴
RUN npm install -g http-server

# 複製當前目錄的內容到工作目錄
COPY . .

# 暴露端口
EXPOSE 8080

# 啟動 HTTP 伺服器
CMD ["http-server", "-p", "8080"]