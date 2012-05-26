<?php
/**
 * Exit when file not found or bad request
 *
 */
function getExit()
{
	header("HTTP/1.0 404 Not Found");
	exit;
}

$config = array(
	'path'   => 'photos/',   // path to images folder
	'save'   => true         // save resized on disk
);

// search for path, parameters etc
if (!preg_match(
	"#^"
		// path to image without 'resize/'
		."/?(". $config['path'] .")(resize/)(.+)"

		// delimeter
		."(_)"

		// parameters
		//   p - constrain proportions and no crop
		//   g - grayscale
		."([pg]*)"

		// width x height
		."(\d{1,4})?(x)(\d{1,4})?"

		// original extension
		."\.(jpe?g|gif|png)"

		// new extension
		."\.?(jpe?g|gif|png)?"

		."$#i",
	$_SERVER['QUERY_STRING'],
	$p
))
{
	getExit();
}

$p = array(
	'path'    => $p[1],
	'resize'  => $p[2],
	'name'    => $p[3],
	'params'  => $p[5],
	'width'   => $p[6],
	'height'  => $p[8],
	'ext'     => $p[9],
	'newext'  => isset($p[10]) ? $p[10] : false
);

$name      = "../". $p['path'] . $p['name'] .".". $p['ext'];
$newname   = "../". $p['path'] . $p['resize'] . $p['name'] ."_". $p['params'] . $p['width'] ."x". $p['height'];

// if no original file
if (!file_exists($name))
	getExit();

// if no target path
if (!is_dir("../". $p['path'] . $p['resize']))
	getExit();

// target dimensions
$tw = intval($p['width']);
$th = intval($p['height']);

// if no one passed
if (($tw < 16) && ($th < 16))
	getExit();


// maybe? - check for presets of sizes


// get image info
$image_info = getImageSize($name);

// source dimensions
$sw = $image_info[0];
$sh = $image_info[1];

// open source image
switch ($image_info[2])
{
	case IMAGETYPE_PNG:
		@$src_img = imageCreateFromPNG($name);
		break;

	case IMAGETYPE_GIF:
		@$src_img = imageCreateFromGIF($name);
		break;

	case IMAGETYPE_JPEG:
	default:
		@$src_img = imageCreateFromJPEG($name);
}

if (!$src_img)
	getExit();

// if source dimensions lower than original - get original
$tw = min($tw, $sw);
$th = min($th, $sh);

// calculate sizes if only one passed
if (!$tw)
	$tw = intval($sw*$th/$sh);
if (!$th)
	$th = intval($sh*$tw/$sw);

// if no one valid
if (($tw < 16) && ($th < 16))
	getExit();

// constrain proportions - crop to match size
if (strpos($p['params'], "p") !== false)
{
	if (($sw > $sh) &&($tw > $th))
	{

	} else {
		$a = $tw;
		$tw = $th;
		$th = $a;
	}
}

$w = $sw;
$h = $w*$th/$tw;

if ($h > $sh)
{
	$h = $sh;
	$w = $h*$tw/$th;
}

$x = floor(($sw-$w)/2);
$y = 0;//floor(($sh-$h)/2);

$w = floor($w);
$h = floor($h);

// starting resize
$targ_img = imageCreateTrueColor($tw, $th);

// crop
imageCopy($src_img, $src_img, 0, 0, $x, $y, $w, $h);

// copy and resize
imageCopyResampled($targ_img, $src_img, 0, 0, 0, 0, $tw, $th, $w, $h);

// gray scale
if (strpos($p['params'], "g") !== false)
{
	imageFilter($targ_img, IMG_FILTER_GRAYSCALE);
}

imageInterlace($targ_img, 1);

// if new extension
if ($p['newext'] != '')
{
	$newname .= ".". $p['ext'];
	switch ($p['newext'])
	{
		case 'png':
			$image_info[2] = IMAGETYPE_PNG;
			break;

		case 'gif':
			$image_info[2] = IMAGETYPE_GIF;
			break;

		case 'jpg':
		case 'jpeg':
		default:
			$image_info[2] = IMAGETYPE_JPEG;
	}
}

// write image
switch ($image_info[2])
{
	case IMAGETYPE_PNG:
		header('Content-type: image/png');
		$newname .= ".png";
		imagePNG($targ_img, $config['save'] ? $newname : null, 5);
		break;

	case IMAGETYPE_GIF:
		header('Content-type: image/gif');
		$newname .= ".gif";
		imageGIF($targ_img, $config['save'] ? $newname : null);
		break;

	case IMAGETYPE_JPEG:
	default:
		header('Content-type: image/jpeg');
		$newname .= ".jpg";
		imageJPEG($targ_img, $config['save'] ? $newname : null, 95);
}

imageDestroy($src_img);
imageDestroy($targ_img);

// out
if ($config['save'])
{
	$f = fopen($newname, "r");
	fpassthru($f);
}
?>