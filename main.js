const fileInput = document.getElementById('fileInput');
const dropzone  = document.getElementById('dropzone');

dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('border-blue-400', 'bg-blue-50');
});
dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('border-blue-400', 'bg-blue-50');
});
dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('border-blue-400', 'bg-blue-50');
  const file = e.dataTransfer.files[0];
  if (file) processFile(file);
});

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) processFile(fileInput.files[0]);
});

function processFile(file) {
  if (!file.type.match(/image\/jpe?g/i)) {
    showError('JPEGファイルのみ対応しています。');
    return;
  }

  // プレビュー表示
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('preview').src = e.target.result;
    document.getElementById('previewWrapper').classList.remove('hidden');
  };
  reader.readAsDataURL(file);

  // Exif 読み込み
  EXIF.getData(file, function () {
    const latArr = EXIF.getTag(this, 'GPSLatitude');
    const lngArr = EXIF.getTag(this, 'GPSLongitude');
    const latRef = EXIF.getTag(this, 'GPSLatitudeRef')  || 'N';
    const lngRef = EXIF.getTag(this, 'GPSLongitudeRef') || 'E';

    document.getElementById('resultWrapper').classList.remove('hidden');

    if (!latArr || !lngArr) {
      showEmpty();
      return;
    }

    try {
      const lat = dmsToDecimal(latArr, latRef);
      const lng = dmsToDecimal(lngArr, lngRef);

      document.getElementById('latValue').textContent = lat.toFixed(7) + '°';
      document.getElementById('lngValue').textContent = lng.toFixed(7) + '°';
      document.getElementById('dmsValue').textContent =
        formatDMS(latArr, latRef) + '  /  ' + formatDMS(lngArr, lngRef);

      document.getElementById('resultSuccess').classList.remove('hidden');
      document.getElementById('resultEmpty').classList.add('hidden');
      document.getElementById('resultError').classList.add('hidden');

      fetchAddress(lat, lng);
    } catch (err) {
      showError('位置情報の解析に失敗しました: ' + err.message);
    }
  });
}

// DMS配列（度・分・秒）を10進数に変換する
// exif-js は各値を { numerator, denominator } の Rational で返す場合がある
function toNum(v) {
  if (typeof v === 'number') return v;
  if (v && typeof v === 'object' && 'numerator' in v) {
    return v.denominator === 0 ? 0 : v.numerator / v.denominator;
  }
  return Number(v);
}

function dmsToDecimal(dmsArr, ref) {
  const deg = toNum(dmsArr[0]);
  const min = toNum(dmsArr[1]);
  const sec = toNum(dmsArr[2]);
  let dec = deg + min / 60 + sec / 3600;
  if (ref === 'S' || ref === 'W') dec = -dec;
  return dec;
}

function formatDMS(dmsArr, ref) {
  const d = toNum(dmsArr[0]).toFixed(0);
  const m = toNum(dmsArr[1]).toFixed(0);
  const s = toNum(dmsArr[2]).toFixed(2);
  return `${d}° ${m}' ${s}" ${ref}`;
}

async function fetchAddress(lat, lng) {
  const el = document.getElementById('addressValue');
  el.textContent = '取得中...';
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ja`,
      { headers: { 'Accept-Language': 'ja' } }
    );
    const data = await res.json();
    el.textContent = data.display_name ?? '住所が見つかりません';
  } catch {
    el.textContent = '住所の取得に失敗しました';
  }
}

function showEmpty() {
  document.getElementById('resultEmpty').classList.remove('hidden');
  document.getElementById('resultSuccess').classList.add('hidden');
  document.getElementById('resultError').classList.add('hidden');
}

function showError(msg) {
  document.getElementById('resultWrapper').classList.remove('hidden');
  document.getElementById('resultError').classList.remove('hidden');
  document.getElementById('resultSuccess').classList.add('hidden');
  document.getElementById('resultEmpty').classList.add('hidden');
  document.getElementById('errorMessage').textContent = msg;
}
