<?php
$file = "counter.txt";

// Lire le fichier
$count = (int)file_get_contents($file);

// +1 visite
$count++;

// Réécrire le fichier
file_put_contents($file, $count);

// Retourner le nombre
echo $count;
?>
