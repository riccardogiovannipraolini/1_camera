from rembg import remove
from PIL import Image

input_path = 'assets/varco.png'
output_path = 'assets/varco_transparent.png'

try:
    with open(input_path, 'rb') as i:
        with open(output_path, 'wb') as o:
            input_image = i.read()
            output_image = remove(input_image)
            o.write(output_image)
    print("Background removed successfully.")
except Exception as e:
    print(f"Error: {e}")
