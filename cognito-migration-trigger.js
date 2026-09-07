import { CognitoIdentityProviderClient, AdminInitiateAuthCommand, AdminGetUserCommand } from "@aws-sdk/client-cognito-identity-provider";

// PURANE (OLD) AWS ACCOUNT KI DETAILS YAHAN DAALIYE
const OLD_REGION = "ap-south-1";
const OLD_USER_POOL_ID = "ap-south-1_CY0zEOJDc";
const OLD_CLIENT_ID = "4o3i1jt6ii1qs2b0h7t3326rpe"; 
// Note: Lambda ko old account se baat karne ke liye AWS_ACCESS_KEY_ID aur AWS_SECRET_ACCESS_KEY 
// environment variables set karne padenge purane account wale, warna cross-account auth fail ho jayega.

const client = new CognitoIdentityProviderClient({ 
    region: OLD_REGION,
    // credentials: {
    //     accessKeyId: process.env.OLD_ACCOUNT_ACCESS_KEY,
    //     secretAccessKey: process.env.OLD_ACCOUNT_SECRET_KEY
    // }
});

export const handler = async (event) => {
    console.log("Migration Trigger Event: ", JSON.stringify(event, null, 2));

    if (event.triggerSource === "UserMigration_Authentication") {
        const username = event.userName;
        const password = event.request.password;

        try {
            // Step 1: Purane pool me user ka password check karo
            const authCommand = new AdminInitiateAuthCommand({
                AuthFlow: "ADMIN_NO_SRP_AUTH",
                AuthParameters: {
                    USERNAME: username,
                    PASSWORD: password
                },
                ClientId: OLD_CLIENT_ID,
                UserPoolId: OLD_USER_POOL_ID
            });

            await client.send(authCommand);
            console.log(`User ${username} successfully authenticated in OLD pool.`);

            // Step 2: Purane pool se user ki details (attributes) nikalo
            const getUserCommand = new AdminGetUserCommand({
                UserPoolId: OLD_USER_POOL_ID,
                Username: username
            });

            const userData = await client.send(getUserCommand);
            
            // Step 3: Ye details NAYE pool ko do taaki wo user create kar sake
            event.response.userAttributes = {};
            event.response.finalUserStatus = "CONFIRMED";
            event.response.messageAction = "SUPPRESS"; // Welcome email rokne ke liye

            if (userData.UserAttributes) {
                userData.UserAttributes.forEach(attr => {
                    // Cognito sub (ID) ko ignore karna hota hai
                    if (attr.Name !== "sub") {
                        event.response.userAttributes[attr.Name] = attr.Value;
                    }
                });
            }

            // Email verified status fix
            if (!event.response.userAttributes.email_verified) {
                event.response.userAttributes.email_verified = "true";
            }

            return event;

        } catch (error) {
            console.error("Migration Failed or Bad Password: ", error);
            throw new Error("Bad password or user not found");
        }
    } 
    
    else if (event.triggerSource === "UserMigration_ForgotPassword") {
        // Agar migrate hone se pehle koi 'Forgot Password' dabaye
        try {
            const getUserCommand = new AdminGetUserCommand({
                UserPoolId: OLD_USER_POOL_ID,
                Username: event.userName
            });

            const userData = await client.send(getUserCommand);

            event.response.userAttributes = {};
            event.response.messageAction = "SUPPRESS";

            if (userData.UserAttributes) {
                userData.UserAttributes.forEach(attr => {
                    if (attr.Name !== "sub") {
                        event.response.userAttributes[attr.Name] = attr.Value;
                    }
                });
            }
            return event;

        } catch (error) {
            console.error("Forgot Password Migration Failed: ", error);
            throw new Error("User not found");
        }
    }

    throw new Error("Bad triggerSource " + event.triggerSource);
};
