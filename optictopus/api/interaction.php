<?php
require dirname(__DIR__).'/includes/bootstrap.php';
require_post(); verify_csrf(); require_ready();
$action=(string)($_POST['action']??''); $id=(int)($_POST['project_id']??0);
$project=project_exists_public($id);
if (!$project) json_response(['ok'=>false,'message'=>'This project is not publicly available.'],404);
if (!in_array($action,['like','rate'],true)) json_response(['ok'=>false,'message'=>'Unknown action.'],400);
if (!throttle('interaction-'.$action, 35, 60)) json_response(['ok'=>false,'message'=>'Too many reactions. Please retry shortly.'],429);
$hash=browser_visitor_hash(true);
try {
 if ($action==='like') {
    if (!flag($project,'allow_likes','enable_likes')) json_response(['ok'=>false,'message'=>'Reactions are disabled for this project.'],403);
    db()->beginTransaction();
    $s=db()->prepare('SELECT id FROM project_likes WHERE project_id=? AND visitor_hash=? FOR UPDATE'); $s->execute([$id,$hash]); $old=$s->fetchColumn();
    if ($old) db()->prepare('DELETE FROM project_likes WHERE id=?')->execute([$old]);
    else db()->prepare('INSERT IGNORE INTO project_likes(project_id,visitor_hash) VALUES (?,?)')->execute([$id,$hash]);
    db()->commit();
    $s=db()->prepare('SELECT COUNT(*) FROM project_likes WHERE project_id=?'); $s->execute([$id]); $count=(int)$s->fetchColumn();
    $visible = flag($project,'show_likes','show_likes');
    $response = ['ok'=>true,'liked'=>!$old,'message'=>$old?'Like removed.':'Thanks for the love!'];
    if ($visible) $response['likes'] = $count;
    json_response($response);
 }
 if (!flag($project,'allow_ratings','enable_ratings')) json_response(['ok'=>false,'message'=>'Ratings are disabled for this project.'],403);
 $stars=filter_var($_POST['stars']??null,FILTER_VALIDATE_INT,['options'=>['min_range'=>1,'max_range'=>5]]);
 if ($stars===false) json_response(['ok'=>false,'message'=>'Select a rating from 1 to 5 stars.'],422);
 db()->prepare('INSERT INTO project_ratings(project_id,visitor_hash,stars) VALUES (?,?,?) ON DUPLICATE KEY UPDATE stars=VALUES(stars),updated_at=UTC_TIMESTAMP()')->execute([$id,$hash,$stars]);
 $s=db()->prepare('SELECT COUNT(*) total, COALESCE(AVG(stars),0) average FROM project_ratings WHERE project_id=?'); $s->execute([$id]);$row=$s->fetch();
 $response = ['ok'=>true,'stars'=>$stars,'message'=>'Your rating has been saved.'];
 if (flag($project,'show_rating','show_rating')) $response['average'] = round((float)$row['average'],1);
 if (flag($project,'show_rating_count','show_rating_count')) $response['ratings'] = (int)$row['total'];
 json_response($response);
} catch (Throwable $ex) {
 if (db()->inTransaction()) db()->rollBack();
 error_log('Reaction error: '.$ex->getMessage());
 json_response(['ok'=>false,'message'=>'Could not save your reaction. Please try again.'],500);
}
