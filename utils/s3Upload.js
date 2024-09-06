const {
  S3Client,
  PutObjectCommand,
  CreateBucketCommand,
  DeleteObjectCommand,
  DeleteBucketCommand,
  paginateListObjectsV2,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require("uuid");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const dotenv = require("dotenv");

dotenv.config();

// Initialize AWS S3
const s3 = new S3Client();
const BUCKET = process.env.S3_BUCKET_NAME;

// POST images to S3
const uploadStoreLogoToS3 = async (file, storeId) => {
  const key = `stores/${storeId}/logo/${uuidv4()}`;
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  });
  try {
    await s3.send(command);
    return { key };
  } catch (error) {
    console.log(error);
    return { error };
  }
};
const uploadStoreProductsToS3 = async (file, storeId, productId) => {
  const key = `stores/${storeId}/products/${productId}/${uuidv4()}`;
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  });
  try {
    await s3.send(command);
    return { key };
  } catch (error) {
    console.log(error);
    return { error };
  }
};

// GET Images from S3
const getLogoUrlFromS3 = async (storeId) => {
  const command = new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: `stores/${storeId}/logo`,
  });

  const { Contents = [] } = await s3.send(command);
  return Contents.length ? Contents[0].Key : "";
};

const getPresignedLogoUrl = async (storeId) => {
  try {
    const logoUrl = await getLogoUrlFromS3(storeId);
    const command = new GetObjectCommand({ Bucket: BUCKET, Key: logoUrl });
    const url = await getSignedUrl(s3, command, { expiresIn: 900 });

    return { location: url };
  } catch (error) {
    console.log(error);
    return { error };
  }
};

const getProductsUrlFromS3 = async (storeId, productId) => {
  const command = new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: `stores/${storeId}/products/${productId}`,
  });

  const { Contents = [] } = await s3.send(command);
  return Contents.map((image) => image.Key);
};

const getPresignedProductsUrl = async (storeId, productId) => {
  try {
    const productsUrl = await getProductsUrlFromS3(storeId, productId);
    const presignedProductsUrl = await Promise.all(
      productsUrl.map(async (key) => {
        const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
        return getSignedUrl(s3, command, { expiresIn: 900 });
      })
    );
    return { presignedProductsUrl };
  } catch (error) {
    console.log(error);
    return { error };
  }
};

// DELETE Images form S3
const deleteImagesFromS3 = async (imageKeys) => {
  const deleteParams = {
    Bucket: BUCKET,
    Delete: {
      Objects: imageKeys.map((key) => ({ Key: key })),
      Quiet: false, // optional, if you want the response to return which objects were deleted
    },
  };

  try {
    const command = new DeleteObjectsCommand(deleteParams);
    const data = await s3.send(command);
    console.log("S3 delete response: ", data);
  } catch (error) {
    console.error("Error deleting images from S3:", error);
    throw new Error("Failed to delete product images from S3");
  }
};

module.exports = {
  uploadStoreLogoToS3,
  uploadStoreProductsToS3,
  getPresignedLogoUrl,
  getPresignedProductsUrl,
  deleteImagesFromS3,
};
