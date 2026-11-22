/*
 * ミッション一覧（ここを書きかえれば、出てくるミッションを増やしたり直したりできます）
 *
 * cat   … カテゴリ。'move'（うごく）/ 'eat'（のむ・たべる）/ 'change'（かえる・やめる）
 * level … 1 = 連続1〜7日目（いちばん軽い）
 *         2 = 連続8〜14日目（ほんの少しだけ長い・能動的）
 *         3 = 連続15日目〜（もう一段だけ）
 * id    … 記録に保存されるので、一度使い始めたら変えないでください（文言 text は変えてOK）
 * tip   … カードに小さく出るひとこと（なくてもOK）
 *
 * 決まりごと:
 * - どれも「こんなんでいいの？」と思うくらい小さく。道具なし・数分以内
 * - 同じ level・同じ cat に最低3つは入れる（カテゴリを絞ったときに足りなくならないように）
 * - 医療・ダイエットの助言にあたる説明は書かない
 */
window.CHIRI_MISSIONS = {
  categories: [
    { id: 'move',   label: 'うごく',       icon: '👟' },
    { id: 'eat',    label: 'のむ・たべる', icon: '🍵' },
    { id: 'change', label: 'かえる・やめる', icon: '🔁' }
  ],

  missions: [
    // ---------- うごく ----------
    { id: 'm1-walk5',     cat: 'move', level: 1, text: '食後に5分だけ歩く',               tip: '家の中をうろうろでもOK' },
    { id: 'm1-stairs1',   cat: 'move', level: 1, text: '階段を1フロア分使う',             tip: '上りでも下りでも' },
    { id: 'm1-squat5',    cat: 'move', level: 1, text: 'スクワットを5回する',             tip: '浅くてOK' },
    { id: 'm1-heel10',    cat: 'move', level: 1, text: 'かかとの上げ下げを10回する',      tip: '歯みがきしながらでも' },
    { id: 'm1-step30',    cat: 'move', level: 1, text: 'その場で足ぶみを30回する',        tip: '30秒くらい' },
    { id: 'm1-shoulder',  cat: 'move', level: 1, text: '肩を前後に10回ずつ回す',          tip: '座ったままでOK' },
    { id: 'm1-standup',   cat: 'move', level: 1, text: '立ち上がって大きくのびを3回する', tip: '10秒で終わる' },

    { id: 'm2-walk10',    cat: 'move', level: 2, text: '食後に10分歩く',                  tip: '買い物ついででもOK' },
    { id: 'm2-stairs2',   cat: 'move', level: 2, text: '階段を2フロア分使う',             tip: '' },
    { id: 'm2-squat10',   cat: 'move', level: 2, text: 'スクワットを10回する',            tip: '5回ずつ2回に分けてもOK' },
    { id: 'm2-wallpush',  cat: 'move', level: 2, text: '壁に手をついて腕立てを10回する',  tip: '壁に向かって立ってやる' },
    { id: 'm2-song',      cat: 'move', level: 2, text: '好きな曲1曲分、体を動かす',       tip: '足ぶみでもダンスでも' },
    { id: 'm2-stretch3',  cat: 'move', level: 2, text: '寝る前に3分ストレッチする',       tip: '' },

    { id: 'm3-walk15',    cat: 'move', level: 3, text: '15分歩く',                        tip: '分けて合計15分でもOK' },
    { id: 'm3-stairs3',   cat: 'move', level: 3, text: '階段を3フロア分使う',             tip: '' },
    { id: 'm3-squat15',   cat: 'move', level: 3, text: 'スクワットを15回する',            tip: '分けてもOK' },
    { id: 'm3-onestop',   cat: 'move', level: 3, text: 'ひと駅・バス停ひとつ分歩く',      tip: 'むずかしい日は家のまわりを1周' },
    { id: 'm3-songs2',    cat: 'move', level: 3, text: '好きな曲2曲分、体を動かす',       tip: '' },

    // ---------- のむ・たべる ----------
    { id: 'e1-firstwater', cat: 'eat', level: 1, text: '最初の一杯を水にする',             tip: '朝いちばんの一杯' },
    { id: 'e1-vegfirst',   cat: 'eat', level: 1, text: '野菜から先に食べる',               tip: '1食だけでOK' },
    { id: 'e1-chopsticks', cat: 'eat', level: 1, text: 'よく噛んで、箸を置く回を作る',     tip: '1回でOK' },
    { id: 'e1-waterbefore',cat: 'eat', level: 1, text: 'ごはんの前に水を一杯飲む',         tip: '' },
    { id: 'e1-chew30',     cat: 'eat', level: 1, text: 'ひと口目を30回噛む',               tip: '最初のひと口だけ' },
    { id: 'e1-smallplate', cat: 'eat', level: 1, text: 'おやつを食べるなら小皿に出す',     tip: '袋から直接食べない' },
    { id: 'e1-soupfirst',  cat: 'eat', level: 1, text: '汁物から口をつける',               tip: '汁物がなければ水でもOK' },

    { id: 'e2-water3',     cat: 'eat', level: 2, text: '水をコップ3杯飲む',                tip: '1日のうちでいつでも' },
    { id: 'e2-vegfirst2',  cat: 'eat', level: 2, text: '2食、野菜から先に食べる',          tip: '' },
    { id: 'e2-slow15',     cat: 'eat', level: 2, text: '1食を15分以上かけて食べる',        tip: '' },
    { id: 'e2-halfsnack',  cat: 'eat', level: 2, text: 'おやつを半分にする',               tip: '残りは明日に' },
    { id: 'e2-addveg',     cat: 'eat', level: 2, text: '野菜のおかずを1品足す',            tip: 'カット野菜やトマトだけでも' },
    { id: 'e2-sweetdrink', cat: 'eat', level: 2, text: '甘い飲みものを1本お休みする',      tip: '' },

    { id: 'e3-vegfirst3',  cat: 'eat', level: 3, text: '3食とも野菜から先に食べる',        tip: '' },
    { id: 'e3-water5',     cat: 'eat', level: 3, text: '水をコップ5杯飲む',                tip: '' },
    { id: 'e3-lessrice',   cat: 'eat', level: 3, text: 'ごはんをいつもよりひと口分少なく盛る', tip: '' },
    { id: 'e3-snackswap',  cat: 'eat', level: 3, text: 'おやつを果物かナッツにかえる',     tip: '' },
    { id: 'e3-slowall',    cat: 'eat', level: 3, text: '2食を15分以上かけて食べる',        tip: '' },

    // ---------- かえる・やめる ----------
    { id: 'c1-teanight',   cat: 'change', level: 1, text: '夜食の代わりにお茶を飲む',      tip: '夜食がない日は、寝る前にお茶を一杯' },
    { id: 'c1-juicewater', cat: 'change', level: 1, text: 'ジュースを水にかえる',          tip: '1本だけでOK' },
    { id: 'c1-phonestretch', cat: 'change', level: 1, text: '寝る前にスマホを置いて1分ストレッチ', tip: '' },
    { id: 'c1-hidesnack',  cat: 'change', level: 1, text: 'お菓子を見えない場所にしまう',  tip: '引き出しや棚の中へ' },
    { id: 'c1-noaisle',    cat: 'change', level: 1, text: 'お店でお菓子の棚の前を通らない', tip: '' },
    { id: 'c1-bed5',       cat: 'change', level: 1, text: 'いつもより5分早く布団に入る',   tip: '' },
    { id: 'c1-nowatch',    cat: 'change', level: 1, text: '1食だけ、画面を見ないで食べる', tip: 'スマホを裏返すだけでOK' },

    { id: 'c2-bed15',      cat: 'change', level: 2, text: 'いつもより15分早く寝る',        tip: '' },
    { id: 'c2-nobuy',      cat: 'change', level: 2, text: 'お菓子を買わずに帰る',          tip: '' },
    { id: 'c2-nosecond',   cat: 'change', level: 2, text: 'おかわりを1回やめる',           tip: '' },
    { id: 'c2-phone15',    cat: 'change', level: 2, text: '寝る前の15分はスマホを置く',    tip: '' },
    { id: 'c2-nowatch2',   cat: 'change', level: 2, text: '2食、画面を見ないで食べる',     tip: '' },

    { id: 'c3-bed30',      cat: 'change', level: 3, text: 'いつもより30分早く寝る',        tip: '' },
    { id: 'c3-nosnack',    cat: 'change', level: 3, text: '今日はお菓子をお休みする',      tip: 'お茶や水でひと息' },
    { id: 'c3-phone30',    cat: 'change', level: 3, text: '寝る前の30分はスマホを置く',    tip: '' },
    { id: 'c3-latenight',  cat: 'change', level: 3, text: '夜9時を過ぎたら飲みものだけにする', tip: '' },
    { id: 'c3-nosweetday', cat: 'change', level: 3, text: '今日は甘い飲みものをお休みする', tip: '' }
  ],

  // 前の日がお休みだった日（レスキュー日）に出す、超かんたんなミッション
  rescue: [
    { id: 'r-water',   cat: 'eat',    text: '水をコップ1杯飲む',         tip: 'これだけで今日はOK' },
    { id: 'r-tea',     cat: 'eat',    text: 'お茶か水をゆっくり1杯飲む', tip: '' },
    { id: 'r-breath',  cat: 'change', text: '深呼吸を3回する',           tip: '10秒で終わる' },
    { id: 'r-window',  cat: 'change', text: '窓を開けて外の空気を吸う',  tip: '' },
    { id: 'r-scale',   cat: 'move',   text: '体重計に乗るだけ',          tip: '数字は見なくてもOK' },
    { id: 'r-stretch', cat: 'move',   text: '立ち上がってのびを1回する', tip: '' }
  ]
};
