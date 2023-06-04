// Initialize the socket
var socket = io();

// Listen for the 'qrCode' event
socket.on('qrCode', function(base64Image) {
    setQRCodeImage(base64Image);
});

// Function to set the QR code image
function setQRCodeImage(base64Image) {
    var qrCodeImg = document.getElementById('qrCodeImg');
    qrCodeImg.src = "data:image/png;base64," + base64Image;
}
