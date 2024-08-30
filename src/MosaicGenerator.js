import React, { useState } from 'react';

function MosaicMontageGenerator() {
  const [mainImage, setMainImage] = useState(null);
  const [smallImages, setSmallImages] = useState([]);
  const [mosaicImage, setMosaicImage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resolution, setResolution] = useState({ width: 1000, height: 1000 });
  const [cols, setCols] = useState(50); // 預設列數為50

  const handleMainImageChange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setResolution({ width: img.width, height: img.height }); // 设置宽高为主图像的分辨率
        setMainImage(event.target.result);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSmallImagesChange = (e) => {
    const files = Array.from(e.target.files);
    const promises = files.map((file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          resolve(event.target.result);
        };
        reader.readAsDataURL(file);
      });
    });
    Promise.all(promises).then((images) => {
      setSmallImages(images);
    });
  };

  const handleResolutionChange = (e) => {
    setResolution({ ...resolution, [e.target.name]: parseInt(e.target.value, 10) });
  };

  const handleColsChange = (e) => {
    setCols(parseInt(e.target.value, 10));
  };

  const generateMosaicMontage = () => {
    if (!mainImage || smallImages.length === 0) return;

    setIsGenerating(true);
    setProgress(0);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const img = new Image();
    img.src = mainImage;
    img.onload = () => {
      const targetWidth = resolution.width;
      const targetHeight = resolution.height;

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      const rows = Math.ceil(targetHeight / (targetWidth / cols));
      const thumbWidth = targetWidth / cols;
      const thumbHeight = targetHeight / rows;

      let loadedCount = 0;
      const totalBlocks = rows * cols;

      const smallImagesResized = smallImages.map((src) => {
        return new Promise((resolve) => {
          const smallCanvas = document.createElement('canvas');
          const smallCtx = smallCanvas.getContext('2d');
          smallCanvas.width = thumbWidth;
          smallCanvas.height = thumbHeight;

          const img = new Image();
          img.src = src;
          img.onload = () => {
            smallCtx.drawImage(img, 0, 0, thumbWidth, thumbHeight);
            resolve(smallCanvas);
          };
        });
      });

      Promise.all(smallImagesResized).then((resizedImages) => {
        if (resizedImages.length < totalBlocks) {
          while (resizedImages.length < totalBlocks) {
            const randomImage = resizedImages[Math.floor(Math.random() * resizedImages.length)];
            resizedImages.push(randomImage);
          }
        }

        shuffleArray(resizedImages);

        const usedImages = new Set(); // 用於追踪已使用的圖像

        for (let i = 0; i < rows; i++) {
          for (let j = 0; j < cols; j++) {
            const x = j * thumbWidth;
            const y = i * thumbHeight;
            const mainBlock = ctx.getImageData(x, y, thumbWidth, thumbHeight);
            const mainAvgColor = getAverageColor(mainBlock);

            const bestMatch = resizedImages.pop(); // 使用 pop 從陣列中取出圖像

            if (bestMatch) {
              adjustImageColor(bestMatch, mainAvgColor, thumbWidth, thumbHeight);
              ctx.drawImage(bestMatch, x, y, thumbWidth, thumbHeight);
              usedImages.add(bestMatch); // 記錄已使用的小圖像
            }

            loadedCount++;
            setProgress(Math.round((loadedCount / totalBlocks) * 100));
          }
        }

        const dataUrl = canvas.toDataURL('image/png');
        setMosaicImage(dataUrl);
        setIsGenerating(false);
      });
    };
  };

  const getAverageColor = (imageData) => {
    const data = imageData.data;
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }
    r = Math.floor(r / (data.length / 4));
    g = Math.floor(g / (data.length / 4));
    b = Math.floor(b / (data.length / 4));
    return { r, g, b };
  };

  const adjustImageColor = (canvas, targetColor, width, height) => {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const currentAvgColor = getAverageColor(imageData);

    const rRatio = targetColor.r / currentAvgColor.r;
    const gRatio = targetColor.g / currentAvgColor.g;
    const bRatio = targetColor.b / currentAvgColor.b;

    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, data[i] * rRatio);
      data[i + 1] = Math.min(255, data[i + 1] * gRatio);
      data[i + 2] = Math.min(255, data[i + 2] * bRatio);
    }

    ctx.putImageData(imageData, 0, 0);
  };

  const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  };

  return (
    <div>
      <h2>Mosaic Montage Generator</h2>
      <div>
        <label>Main Image:</label>
        <input type="file" onChange={handleMainImageChange} disabled={isGenerating} />
      </div>
      <div>
        <label>Small Images:</label>
        <input type="file" multiple onChange={handleSmallImagesChange} disabled={isGenerating} />
      </div>
      <div>
        <label>Width:</label>
        <input
          type="number"
          name="width"
          value={resolution.width}
          onChange={handleResolutionChange}
          disabled={isGenerating}
        />
        <label>Height:</label>
        <input
          type="number"
          name="height"
          value={resolution.height}
          onChange={handleResolutionChange}
          disabled={isGenerating}
        />
      </div>
      <div>
        <label>Columns:</label>
        <select
          name="cols"
          value={cols}
          onChange={handleColsChange}
          disabled={isGenerating}
        >
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
      </div>
      <button onClick={generateMosaicMontage} disabled={isGenerating}>
        {isGenerating ? 'Generating...' : 'Generate Mosaic'}
      </button>
      {isGenerating && (
        <div>
          <p>Generating the mosaic, please wait...</p>
          <progress value={progress} max="100"></progress>
          <p>{progress}%</p>
        </div>
      )}
      {mosaicImage && (
        <div>
          <h3>Generated Mosaic:</h3>
          <img src={mosaicImage} alt="Mosaic" style={{ maxWidth: '100%' }} />
          <br />
          <a href={mosaicImage} download="mosaic_image.png">
            <button>Download Mosaic</button>
          </a>
        </div>
      )}
    </div>
  );
}

export default MosaicMontageGenerator;
