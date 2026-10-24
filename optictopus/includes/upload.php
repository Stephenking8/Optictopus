<?php
/** Upload an image after server-side type, dimension and size validation. */
function store_image(array $file, string $prefix = 'image'): string {
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) throw new RuntimeException('The image could not be uploaded. Check the 4 MB file limit.');
    if (($file['size'] ?? 0) <= 0 || $file['size'] > 4 * 1024 * 1024) throw new RuntimeException('Each image must be 4 MB or smaller.');
    $tmp = (string)$file['tmp_name'];
    if (!is_uploaded_file($tmp)) throw new RuntimeException('Invalid upload source.');
    $info = @getimagesize($tmp);
    if (!$info || $info[0] < 80 || $info[1] < 80 || $info[0] > 8000 || $info[1] > 8000 || $info[0] * $info[1] > 12000000) throw new RuntimeException('Image dimensions must be between 80 and 8000 pixels.');
    $finfo = new finfo(FILEINFO_MIME_TYPE); $mime = $finfo->file($tmp);
    $types = ['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp'];
    if (!isset($types[$mime]) || ($info['mime'] ?? '') !== $mime) throw new RuntimeException('Only valid JPG, PNG and WebP images are allowed.');
    $directory=dirname(__DIR__).'/uploads/projects';
    if (!is_dir($directory) && !mkdir($directory,0755,true) && !is_dir($directory)) throw new RuntimeException('Upload directory is not writable.');
    $name=preg_replace('/[^a-z0-9-]/','',strtolower($prefix)) . '-' . bin2hex(random_bytes(16));
    $path=$directory.'/'.$name.'.'.$types[$mime];
    // GD re-encoding strips embedded metadata and bounds dimensions if GD is available.
    $source = match($mime) {
        'image/jpeg' => function_exists('imagecreatefromjpeg') ? @imagecreatefromjpeg($tmp) : false,
        'image/png' => function_exists('imagecreatefrompng') ? @imagecreatefrompng($tmp) : false,
        'image/webp' => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($tmp) : false,
        default => false,
    };
    if ($source) {
        $w=(int)$info[0]; $h=(int)$info[1]; $scale=min(1,1800/max($w,$h)); $nw=(int)max(1,round($w*$scale)); $nh=(int)max(1,round($h*$scale));
        $dest=imagecreatetruecolor($nw,$nh);
        if ($mime !== 'image/jpeg') {
            imagealphablending($dest,false); imagesavealpha($dest,true);
            imagefill($dest,0,0,imagecolorallocatealpha($dest,0,0,0,127));
        }
        imagecopyresampled($dest,$source,0,0,0,0,$nw,$nh,$w,$h);
        $ok = match($mime) {
            'image/jpeg'=>imagejpeg($dest,$path,85),
            'image/png'=>imagepng($dest,$path,6),
            'image/webp'=>imagewebp($dest,$path,82),
        };
        imagedestroy($dest); imagedestroy($source);
        if (!$ok) throw new RuntimeException('Could not save uploaded image.');
    } else {
        // No GD on host: uploaded bytes passed MIME/dimension validation, but EXIF cannot be stripped.
        if (!move_uploaded_file($tmp,$path)) throw new RuntimeException('Could not save image.');
    }
    @chmod($path,0644);
    return 'uploads/projects/'.basename($path);
}
function uploaded_files(array $files): array {
    if (!isset($files['name']) || !is_array($files['name'])) return [];
    $result=[];
    foreach ($files['name'] as $i=>$name) {
        if (($files['error'][$i] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) continue;
        $result[]=['name'=>$name,'error'=>$files['error'][$i] ?? 4,'size'=>$files['size'][$i] ?? 0,'tmp_name'=>$files['tmp_name'][$i] ?? ''];
    }
    return $result;
}
function delete_uploaded_image(?string $relative): void {
    if (!$relative || !preg_match('~^uploads/projects/[a-z0-9-]+\.(jpg|png|webp)$~D',$relative)) return;
    $file=dirname(__DIR__).'/'.$relative;
    if (is_file($file)) @unlink($file);
}
