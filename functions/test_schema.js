const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");
console.log("SchemaType is:", SchemaType);
if (!SchemaType) {
    console.error("SchemaType is undefined!");
    process.exit(1);
} else {
    console.log("SchemaType is available.");
}
