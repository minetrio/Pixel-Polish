// server.js
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

// Middleware setup
app.use(express.static("public"));
app.use(fileUpload());

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

// Environment variables (secure)
const REMOVE_BG_API_KEY = "YiCApNZS1AFnEcZ4qmnjdZaf";
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// Ensure directories exist
try {
  fs.mkdirSync(UPLOAD_DIR);
} catch (err) {
  if (err.code !== 'EEXIST') {
    console.error('Error creating directories:', err);
    process.exit(1);
  }
}

// Routes
app.get("/", (req, res) => {
    res.render("index.ejs");
});

app.post("/upload", async (req, res) => {
    if (!req.files || !req.files.image) {
        return res.status(400).send('No files were uploaded.');
    }

    const image = req.files.image;
    const imageName = image.name;

    const tempFilePath = path.join(UPLOAD_DIR, imageName);

    image.mv(tempFilePath, async (err) => {
        if (err) {
            console.error('Error saving image:', err);
            return res.status(500).send(err);
        }

        try {
            const formData = new FormData();
            formData.append('size', 'auto');
            formData.append('image_file', fs.createReadStream(tempFilePath), imageName);

            const response = await axios.post(
                'https://api.remove.bg/v1.0/removebg',
                formData,
                {
                    headers: {
                        ...formData.getHeaders(),
                        'X-Api-Key': REMOVE_BG_API_KEY,
                    },
                    responseType: 'arraybuffer',
                }
            );

            if (response.status !== 200) {
                console.error('Error:', response.status, response.statusText);
                return res.status(500).send('Error removing background');
            }

            try {
                res.set({
                    'Content-Type': 'image/png',
                    'Content-Disposition': `attachment; filename="blurred_image.png"`
                });
                res.send(response.data);
            } catch (error) {
                console.error('Error sending response:', error);
                return res.status(500).send('Error downloading image');
            }

            fs.unlinkSync(tempFilePath);
        } catch (error) {
            console.error('Error removing background:', error);
            return res.status(500).send('Error removing background');
        }
    });
});

app.listen(PORT, () => {
    console.log(`App running on port ${PORT}`);
});