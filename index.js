const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const path = require("path");
const fileUpload = require("express-fileupload");
const axios = require("axios");
const FormData = require('form-data');
const fs = require('fs');

const PORT = 3000;
const app = express();

// Middleware setup (remove redundancy)
app.use(express.static("public"));
app.use(fileUpload());

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

// Environment variables (secure)
const REMOVE_BG_API_KEY = "YiCApNZS1AFnEcZ4qmnjdZaf";
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// Ensure directories exist (avoid unnecessary recursive option)
try {
  fs.mkdirSync(UPLOAD_DIR);
} catch (err) {
  if (err.code !== 'EEXIST') {
    console.error('Error creating directories:', err);
    process.exit(1); // Exit if directory creation fails
  }
}

app.get("/", (req, res) => {
    res.render("index.ejs"); // Assuming an index.ejs exists
});

app.post("/upload", async (req, res) => {
    if (!req.files || !req.files.image) {
        return res.status(400).send('No files were uploaded.');
    }

    const image = req.files.image;
    const imageName = image.name;

    // Temporary file path (consider using OS-specific temporary directory module)
    const tempFilePath = path.join(UPLOAD_DIR, imageName);

    // Save the uploaded image to a temporary file
    image.mv(tempFilePath, async (err) => {
        if (err) {
            console.error('Error saving image:', err);
            return res.status(500).send(err);
        }

        try {
            // Remove background using remove.bg API
            const formData = new FormData();
            formData.append('size', 'auto'); // Optional: Set image size
            formData.append('image_file', fs.createReadStream(tempFilePath), imageName);

            const response = await axios.post(
                'https://api.remove.bg/v1.0/removebg',
                formData,
                {
                    headers: {
                        ...formData.getHeaders(),
                        'X-Api-Key': REMOVE_BG_API_KEY, // Load from environment variable
                    },
                    responseType: 'arraybuffer',
                }
            );

            if (response.status !== 200) {
                console.error('Error:', response.status, response.statusText);
                return res.status(500).send('Error removing background');
            }

            // Download processed image
            try {
                res.setHeader('Content-Type', 'image/png'); // Adjust for specific image type
                const filename = `processed-${imageName}`;
                res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
                res.send(response.data);
            } catch (error) {
                console.error('Error sending response:', error);
                return res.status(500).send('Error downloading image');
            }

            // Clean up temporary file (optional)
            // fs.unlinkSync(tempFilePath);
        } catch (error) {
            console.error('Error removing background:', error);
            return res.status(500).send('Error removing background');
        }
    });
});

app.listen(PORT, () => {
    console.log(`App running on port ${PORT}`);
});
