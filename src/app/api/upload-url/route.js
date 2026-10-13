import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";

function getS3Client() {
  const accessKeyId = process.env.S3_UPLOAD_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_UPLOAD_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
  const sessionToken = process.env.AWS_SESSION_TOKEN;
  const region = process.env.AWS_REGION || "ap-south-1";

  const config = { region };

  if (accessKeyId && secretAccessKey) {
    config.credentials = {
      accessKeyId: accessKeyId.trim(),
      secretAccessKey: secretAccessKey.trim(),
      ...(sessionToken ? { sessionToken: sessionToken.trim() } : {})
    };
  }

  return new S3Client(config);
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get("file");
    const fileType = searchParams.get("fileType");

    // Naya logic: Hum puchenge ki image kis folder me dalni hai (default: products)
    const folder = searchParams.get("folder") || "products";

    if (!fileName || !fileType) {
      return NextResponse.json({ error: "Missing file name or type" }, { status: 400 });
    }

    // Security check: Sirf allowed folders me hi image/audio upload ho sake
    const allowedFolders = ["products", "avatars", "logos", "audio"];
    if (!allowedFolders.includes(folder)) {
      return NextResponse.json({ error: "Invalid folder" }, { status: 400 });
    }

    // Naya dynamic file path
    const uniqueFileName = `public/${folder}/${Date.now()}-${fileName.replace(/\s+/g, '-')}`;

    const bucketName = process.env.S3_BUCKET_NAME || process.env.AWS_S3_BUCKET_NAME || "mooncliq-prod-images";

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: uniqueFileName,
      ContentType: fileType,
    });

    const s3Client = getS3Client();
    // Generate URL valid for 5 minutes
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    const fileUrl = `https://${bucketName}.s3.${process.env.AWS_REGION || "ap-south-1"}.amazonaws.com/${uniqueFileName}`;

    return NextResponse.json({ uploadUrl, fileUrl });
  } catch (error) {
    console.error("Error generating presigned URL", error);
    return NextResponse.json({ error: "Failed to generate URL" }, { status: 500 });
  }
}
