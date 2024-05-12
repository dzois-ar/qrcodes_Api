// Extracting URL parameters from the current window's URL
var url = new URL(window.location.href)

// Checking if the URL contains a parameter named "invalid"
if (url.searchParams.get("invalid")){
    // If "invalid" parameter is found, display a Swal (SweetAlert) modal with error message
    Swal.fire({
        text: `Try again.`, // Error message displayed in the modal
        imageWidth: 500,
        imageHeight: 300,
        background: 'rgb(224, 207, 207)',
        icon: 'error',
        confirmButtonText: 'OK'
    })
}