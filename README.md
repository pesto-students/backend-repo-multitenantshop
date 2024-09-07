# **ShopHive** | <img src="https://i.postimg.cc/J4fqh9L2/shop-Hive-Logo.png" alt="ShopHive Logo" width="52px" height="52px"/>


ShopHive is a robust multi-tenant e-commerce platform built to enable small businesses to create and customize their online stores effortlessly. With features like product management, custom subdomains, dynamic themes, and more, ShopHive helps store owners manage their online presence with ease.

## Table of Contents
- [Demo](#demo)
- [Installation](#installation)
- [Technology Stack](#technology-stack)
- [Author](#author)
- [License](#license)

## Demo
Check out the live demo of ShopHive:

[Live Demo](https://shophive.netlify.app/)

**Test Credentials:**
- **Tenant Login:**
  - Email: `pestoproject-tenant.com`
  - Password: `1111111`

## Installation
### Frontend Installation
1. Clone the repository
   ```bash
   git clone https://github.com/pesto-students/backend-repo-multitenantshop.git
   cd backend-repo-multitenantshop
   npm install
2. Setup .env file
   - Create a .env file in the root directory
   - Add the following:
     ```bash
     MONGO_URI=mongodb://your_mongo_db_url
     AWS_ACCESS_KEY_ID=your_aws_access_key
     AWS_SECRET_ACCESS_KEY=your_aws_secret
     S3_BUCKET_NAME=your_s3_bucket
3. Start the server
   ```bash
   npx nodemon server.js

## Technology Stack
- Node.js - Backend runtime
- Express.js - Web framework
- MongoDB - Database
- AWS S3 - Image storage
- Mongoose - MongoDB object modeling
- AWS SDK (client-s3) - File management

## Author
- Aniket Sharma

## License
This project is licensed under the MIT License.

