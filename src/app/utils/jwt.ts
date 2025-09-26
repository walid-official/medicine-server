import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";

export const generateToken = (
  payload: JwtPayload,
  secret: string,
  expiresIn: string
) => {
  console.log("🔑 [JWT] Generating token with secret:", secret); // Debug log
  console.log("📦 [JWT] Payload:", payload);

  const token = jwt.sign(payload, secret, {
    expiresIn,
  } as SignOptions);

  console.log("✅ [JWT] Token generated successfully");
  return token;
};

export const verifyToken = (token: string, secret: string) => {
  console.log("🔍 [JWT] Verifying token...");
  console.log("🟡 [JWT] Token received:", token);
  console.log("🔑 [JWT] Using secret:", secret);

  try {
    const verifiedToken = jwt.verify(token, secret);
    console.log("✅ [JWT] Token verified:", verifiedToken);
    return verifiedToken;
  } catch (err) {
    console.error("❌ [JWT] Verification failed:", err);
    throw err;
  }
};
