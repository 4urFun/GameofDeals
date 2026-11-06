/* Game of Deals — محرك القواعد (الإصدار الخامس)
   يعمل في المتصفح (ENGINE) وفي Node للاختبارات. */
const ENGINE=(function(){
/*ENGINE*/
const COLORS={
 lb:{n:'أزرق فاتح',hex:'#8fd0e8',size:3,rent:[1,2,3]},
 db:{n:'أزرق غامق',hex:'#3640c8',size:2,rent:[1,2]},
 pu:{n:'بنفسجي',hex:'#a03cb4',size:3,rent:[2,3,4]},
 or:{n:'برتقالي',hex:'#f08a24',size:3,rent:[2,4,6]},
 re:{n:'أحمر',hex:'#b0303a',size:3,rent:[3,5,7]},
 ye:{n:'أصفر',hex:'#d2d622',size:3,rent:[3,6,8]},
 gr:{n:'أخضر',hex:'#33a650',size:3,rent:[4,7,10]},
 bk:{n:'أسود',hex:'#2a2a2a',size:2,rent:[5,12]},
 br:{n:'بني',hex:'#7e4e2e',size:3,rent:[3,6,9]},
 gy:{n:'رمادي',hex:'#a3a3a3',size:2,rent:[3,7]},
 st:{n:'محطات',hex:'#e2483c',size:4,rent:[1,2,3,4]},
 rs:{n:'مطاعم',hex:'#d6a23e',size:2,rent:[2,3]},
};
const NO_BUILD=['st','rs'];
const CARDS={};
function def(id,o){CARDS[id]=Object.assign({id,cnt:1},o);}
// ---- lands
[['lb',1,[['lb_tabuk','شارع تبوك'],['lb_aqaria','شارع العقارية'],['lb_orouba','شارع العروبة'],['lb_qurayyan','شارع القريان'],['lb_kharj','شارع الخرج']]],
 ['or',2,[['or_malaz','شارع الملز'],['or_south','الدائري الجنوبي'],['or_wazir','شارع الوزير'],['or_sitteen','شارع الستين'],['or_dabab','شارع الضباب']]],
 ['ye',3,[['ye_abha','طريق أبها'],['ye_dammam','طريق الدمام'],['ye_jalawi','طريق سعود بن جلوي'],['ye_east','الدائري الشرقي'],['ye_tahlia','شارع التحلية']]],
 ['gr',4,[['gr_hail','طريق حائل'],['gr_west','الدائري الغربي'],['gr_khalid','شارع خالد بن الوليد'],['gr_anas','شارع أنس بن مالك'],['gr_jarir','شارع جرير']]],
 ['bk',5,[['bk_north','الدائري الشمالي'],['bk_madina','شارع المدينة'],['bk_qassim','طريق القصيم']]],
 ['db',1,[['db_makka','شارع مكة'],['db_hamza','شارع حمزة'],['db_abraj','شارع الأبراج']]],
 ['pu',2,[['pu_khalid','طريق الملك خالد'],['pu_arafa','شارع عرفة'],['pu_hijaz','طريق الحجاز'],['pu_takhassusi','شارع التخصصي'],['pu_haraj','حراج بن قاسم']]],
 ['re',3,[['re_qowat','شارع القوات الخاصة'],['re_taif','شارع الطائف'],['re_jeddah','سوق جدة'],['re_fahd','طريق الملك فهد'],['re_riyadh','سوق الرياض']]],
 ['br',4,[['br_abubakr','طريق أبو بكر'],['br_imam','شارع الإمام سعود'],['br_salman','شارع سلمان بن محمد'],['br_othman','طريق عثمان بن عفان'],['br_omar','طريق عمر بن الخطاب']]],
 ['gy',2,[['gy_hafsa','شارع حفصة بنت عمر'],['gy_mishal','شارع مشعل بن عبدالعزيز'],['gy_faisal','طريق فيصل بن بندر']]],
].forEach(([c,v,arr])=>arr.forEach(([id,n])=>def(id,{t:'land',c,v,n,g:'أراضٍ'})));
for(let k=1;k<=7;k++)def('st_'+k,{t:'land',c:'st',v:1,n:'محطة',g:'أراضٍ'});
for(let k=1;k<=3;k++)def('rs_'+k,{t:'land',c:'rs',v:2,n:'مطعم',g:'أراضٍ'});
def('du_blue',{t:'dual',cs:['db','lb'],v:2,n:'شارع السويلم / طريق درباب',g:'أراضٍ بوجهين'});
def('du_stres',{t:'dual',cs:['st','rs'],v:3,n:'محطة / مطعم',g:'أراضٍ بوجهين'});
def('du_greenblack',{t:'dual',cs:['bk','gr'],v:7,n:'شارع الثلاثين / طريق الملك فيصل',g:'أراضٍ بوجهين'});
def('du_purpleorange',{t:'dual',cs:['or','pu'],v:3,n:'شارع الوشم / شارع الجامعة',g:'أراضٍ بوجهين'});
def('du_redyellow',{t:'dual',cs:['ye','re'],v:4,n:'شارع العليا / طريق خريص',g:'أراضٍ بوجهين'});
def('du_graybrown',{t:'dual',cs:['br','gy'],v:5,n:'طريق المطار / طريق الملك سلمان',g:'أراضٍ بوجهين'});
def('joker',{t:'joker',v:0,cnt:2,n:'جوكر',d:'الجوكر عبارة عن أي أرض.',g:'أراضٍ بوجهين'});
// ---- buildings
def('house',{t:'build',b:'house',v:2,bonus:2,cnt:4,n:'بيت',d:'يضاف إلى المجموعة الكاملة ويزيد القيمة 2M.',g:'مبانٍ'});
def('hotel',{t:'build',b:'hotel',v:5,bonus:5,cnt:2,n:'فندق',d:'يضاف إلى المجموعة الكاملة بشرط وجود البيت ويزيد القيمة 5M.',g:'مبانٍ'});
def('castle',{t:'build',b:'castle',v:3,bonus:3,cnt:2,n:'قصر',d:'يضاف إلى المجموعة الكاملة ويزيد القيمة 3M.',g:'مبانٍ'});
def('fence',{t:'build',b:'fence',v:0,bonus:0,cnt:2,n:'شبوك',d:'تضاف للمجموعة الكاملة لتأمينها من السرقة.',g:'مبانٍ'});
// ---- money
[[1,8],[2,8],[3,6],[4,6],[5,6],[6,4],[8,4],[10,4],[20,2]].forEach(([v,c])=>def('m'+v,{t:'money',v,cnt:c,n:v+' مليون',g:'أموال'}));
def('visa',{t:'visa',v:0,n:'فيزا بلاتينيوم',d:'مبلغ مفتوح يوضع في البنك. تكفي لتسديد أي مبلغ يُطلب منك، وتنتقل إلى بنك صاحب الطلب.',g:'أموال'});
// ---- rent
def('rent_po',{t:'rent',cs:['pu','or','rs','st'],cnt:2,n:'إيجار: بنفسجي / برتقالي / مطاعم / محطات',d:'على جميع اللاعبين الدفع لك قيمة إيجار أحد الألوان الموجودة في البطاقة.',g:'إيجارات'});
def('rent_bl',{t:'rent',cs:['lb','db','st'],cnt:2,n:'إيجار: أزرق فاتح / أزرق غامق / محطات',d:'على جميع اللاعبين الدفع لك قيمة إيجار أحد الألوان الموجودة في البطاقة.',g:'إيجارات'});
def('rent_bg',{t:'rent',cs:['br','gy','st'],cnt:2,n:'إيجار: بني / رمادي / محطات',d:'على جميع اللاعبين الدفع لك قيمة إيجار أحد الألوان الموجودة في البطاقة.',g:'إيجارات'});
def('rent_yr',{t:'rent',cs:['ye','re','rs','st'],cnt:2,n:'إيجار: أصفر / أحمر / مطاعم / محطات',d:'على جميع اللاعبين الدفع لك قيمة إيجار أحد الألوان الموجودة في البطاقة.',g:'إيجارات'});
def('rent_gb',{t:'rent',cs:['gr','bk','st'],cnt:2,n:'إيجار: أخضر / أسود / محطات',d:'على جميع اللاعبين الدفع لك قيمة إيجار أحد الألوان الموجودة في البطاقة.',g:'إيجارات'});
def('rent_wild',{t:'action',a:'rentwild',cnt:4,n:'إيجار (كل الألوان)',d:'اختر لاعباً يدفع لك قيمة الإيجار للأرض التي تريد.',g:'إيجارات'});
def('rent_gold',{t:'action',a:'rentgold',n:'Golden Rent',d:'اختر أي أرض موجودة في ساحة اللعب، وليس بالشرط أن تكون بساحتك، وعلى جميع اللاعبين دفع إيجارها.',g:'إيجارات'});
// ---- actions  [id, key, name, desc, count]
const A=[
['a_layikthar','layikthar','لا يكثر','لا تدفع قيمة الإيجار فقط.',4],
['a_theeb','theeb','لعبتك يا الذيب','ازرف أرضاً من كل لاعب بشرط عدم وجودها بمجموعة. الضرر: يتلقى صاحب الأمر غفوة الدورة القادمة.',1],
['a_dabatni','dabatni','ضبطني أنت وياها!!','على جميع اللاعبين إعطائك أرض من اختيارهم.',1],
['a_cash','cash','نبي كاش','على جميع اللاعبين إعطائك مليونين.',2],
['a_jail','jail','Go To JAIL!!','أدخل أي لاعب إلى السجن. للخروج من السجن دفع قيمة مليونين.',2],
['a_double','double','Double +2','تضم هذي البطاقة مع أي بطاقة إيجار أو ضريبة لتضعيف المبلغ مرتين 2X.',2],
['a_triple','triple','Triple','تضم هذي البطاقة مع أي بطاقة إيجار أو ضريبة لتضعيف المبلغ ثلاث مرات 3X.',1],
['a_bank','bank','إزرف البنك','تقوم هذه البطاقة بسرقة البنك كاملاً من أي لاعب.',1],
['a_barrier','barrier','حاجز','يوضع الحاجز أمام ساحة لعبك ويقوم بحمايتك من جميع البطاقات ما عدا البطاقات السوداء دورة واحدة فقط.',2],
['a_left','left','روح يساار','تقوم هذي البطاقة بتحويل أي أمر موجه إليك فقط إلى اللاعب الذي على يسارك (لا ترد على البطاقات السوداء).',2],
['a_getjoker','getjoker','Get The Joker','إسرق الجوكر ولو كان في مجموعة.',1],
['a_haza','haza','هذا اللي معي!','عندما يطلب منك مبلغ ضخم ولا تملك في البنك رصيداً تسد عنك هذي البطاقة المبلغ المطلوب منك.',2],
['a_atni','atni','عطني وأعطيك','خذ أي أرض من لاعب مقابل أرض من عندك (بشرط ما تكون في مجموعة).',3],
['a_eslahat','eslahat','إصلاحات','اختر أي لاعب ليدفع لك غرامة عن كل مجموعة تمتلكها 3 مليون وشبك 2 مليون وجوكر 2 مليون وبيت أو فندق أو قصر 1 مليون.',1],
['a_loading','loading','Loading...','لتأخير الأمر الموجه إليك فقط إلى الدورة القادمة لتتيح لك فرصة بالرد على الأمر (لا ترد البطاقات السوداء).',1],
['a_asfeq','asfeq','إصفقها في واحد','حوّل الأمر الموجه إليك فقط لأي لاعب ما عدا صاحب الطلب (لا ترد البطاقات السوداء).',1],
['a_copy','copy','Copy Paste','تقوم هذه البطاقة بأخذ آخر أمر لُعب في الساحة وتضعه مع البطاقات الموجودة في يدك (لا يمكن أخذ البطاقات السوداء).',1],
['a_slow','slow','Slow Game','جميع اللاعبين يسحبون بطاقة واحدة فقط، واللاعب الذي سيسحب خمس بطاقات يسحب بطاقة واحدة فقط.',1],
['a_estiqaad','estiqaad','اعلمك الاستقعاد!','قم بوضع هذي البطاقة أمام ساحة أحد اللاعبين لكي تمنعه من سحب بطاقتين قبل كل دورة، ليسحب بطاقة واحدة فقط لمدة ثلاث دورات.',1],
['a_swapset','swapset','بدّل المجموعة','بدّل مجموعتك بأي مجموعة موجودة في الساحة بشرط عدم وجود شبك عليها.',1],
['a_reverse','reverse','إعكس الدور','قم بعكس الدور.',2],
['a_emp','emp','E.M.P','جميع اللاعبين يسحب بطاقة واحدة وحركة واحدة فقط لدورة كاملة.',1],
['a_yaweel','yaweel','ياويلكم','إسحب خمس بطاقات وعدد الحركات مفتوح. الضرر: يتلقى صاحب الأمر غفوة الدورة القادمة.',1],
['a_mazharia','mazharia','خلك مزهرية','اختر أي لاعب يكشف أوراقه لكل اللاعبين.',1],
['a_payforme','payforme','أقول إدفع عني','في حال طُلب منك مبلغ أو طُلب من الكل اختر أي لاعب ما عدا صاحب الطلب ليدفع عنك.',2],
['a_2cards','draw2','2 Cards','إسحب بطاقتين.',2],
['a_pay5','pay5','أقول إدفع!!','أختر لاعباً يدفع لك خمسة مليون.',2],
['a_sader','sader','صادر مجموعة','اختر مجموعة من أي لاعب بشرط عدم وجود الشبك واحرقها.',1],
['a_takecard','takecard','خذ بطاقة!','إسحب بطاقة من البطاقات الموجودة في يد اللاعب وأضفها في بطاقاتك.',2],
['a_kharab','kharab','خرب اللعب','قم بقراءة مهمات اللاعبين!!',1],
['a_stealset','stealset','إزرف مجموعة!','إزرف مجموعة من أي لاعب.',3],
['a_moab','moab','M.O.A.B','أختر أي لاعب واحرق جميع أراضيه ما عدا المجموعات.',1],
['a_again','again','AGAIN','إلعب مرة أخرى.',2],
['a_newhand','newhand','غيّر الورق','غيّر ورقك بخمس جديدة.',2],
['a_rusoom','rusoom','رسوم بلدية','اختر أي لاعب يدفع لك عن كل أرض يملكها مليون بشرط ليست في مجموعة.',1],
['a_bordga','bordga','BORDGA','تقوم هذي البطاقة برفض أي أمر وتتحول إلى حاجز مؤقت يدافع عنك لحين انتهاء دور اللاعب المهاجم (لا ترد البطاقات السوداء).',1],
['a_burn','burn','إحرق!!','تقوم هذي البطاقة بحرق بطاقة واحدة من البطاقات التي في يدك حتى تتخلص منها.',4],
['a_shofghairi','shofghairi','شف غيري','تقوم بالدفاع عنك عن أي أمر موجه إليك فقط ما عدا البطاقات السوداء، وتمنح المهاجم فرصة أخرى باختيار لاعب آخر، وفي حال عدم توفر لاعب آخر يخسر المهاجم الأمر.',2],
['a_spit','spit','بنت السبيت','ضريبة: اختر أي لاعب يدفع 13 مليون، ويمكن إضافة الدبل عليها لتصبح 26 مليون.',1],
['a_taateel','taateel','تعطيل!','لرفض أي أمر موجه إليك (ما عدا البطاقات السوداء)، ويمكن الدفاع بها عن أي لاعب واحد فقط.',1],
['a_ebla','ebla','ابلع ذي طيب','قم بوضع هذي البطاقة أمام ساحة أحد اللاعبين ليلعب حركة واحدة فقط لمدة ثلاث دورات.',1],
['a_2moves','moves2','حركتين قدام','زيادة حركتين إضافية.',2],
['a_box','box','صندوق','إسحب مهمة أخرى.',1],
['a_luck','luck','انت وحظك','بدّل مهامك القديمة الغير محققة بمهام جديدة، وفي حال جميع مهامك محققة اسحب مهمة جديدة.',1],
['a_fast','fast','FAST GAME','جميع اللاعبين حركة واحدة فقط لمدة دورة واحدة.',1],
['a_auction','auction','مزاد!','خذ أرضاً من ثلاثة لاعبين (ليست في مجموعة) ويتم المزاد على كل أرض، وصاحب أكثر مبلغ للأرض يحصل عليها.',1],
['a_tax','tax','ضريبة INCOME TAX','إختر أي لاعب ليدفع لك 3 مليون.',2],
['a_stealland','stealland','إزرف أرض','إسرق أي أرض (بشرط أن لا تكون في مجموعة كاملة).',3],
['a_boom','boom','BOOOM','احرق أرضاً من كل لاعب (شرط أن لا تكون في مجموعة).',1],
['a_nothing','nothing','ما عنديلك شي','تمنعك هذي البطاقة من تسديد أي مبلغ سواء إيجار أو غرامة أو وين الباقي.',2],
['a_right','right','روح يمييين','تقوم هذي البطاقة بتحويل أي أمر موجه إليك فقط إلى اللاعب الذي على يمينك (لا ترد على البطاقات السوداء).',2],
['a_aks','aks','عكس!!','إعكس الأمر الموجه إليك فقط لتكون أنت صاحب الأمر (لا ترد البطاقات السوداء).',1],
['a_nap','nap','خذ غفوه!','إمنع أي لاعب من اللعب دورة واحدة فقط.',3],
['a_darb','darb','خرب عليه!!','إسرق أرض حتى لو كانت في مجموعة!!',1],
['a_jibha','jibha','جبها أنت','في حال طُلب منك مبلغ يقوم صاحب الطلب بالدفع لك أنت.',2],
['a_confiscate','confiscate','مصادرة','إختر أي لاعب واحرق أرضاً من أراضيه (بشرط ألا تكون في مجموعة).',2],
['a_change','change','وين الباقي؟','تقوم هذه البطاقة بإرجاع الباقي في حالة دفعت مبلغاً!!',2],
['a_swaphand','swaphand','بدّل الورق','بدّل الورق مع أي لاعب (بشرط أن يكون معه ورقة أو أكثر).',2],
['a_peek','peek','إكشف الورق!!','أختر أي لاعب لرؤية أوراقه.',2],
['a_give','give','شف لها صرفة','إختر أي لاعب وقم بإعطائه بطاقة من بطاقات يدك.',2],
['a_tactic','tactic','وحدة تكفيك','إختر أي لاعب ليلعب حركة واحدة فقط في دوره القادم.',2],
['a_play_away','playaway','العب بعيييد!!','لرفض أي أمر ما عدا البطاقات السوداء!!',4],
];
A.forEach(([id,a,n,d,cnt,rev])=>def(id,{t:'action',a,n,d,cnt,g:'أوامر',review:!!rev}));
def('b_hacker',{t:'action',a:'hacker',black:true,n:'HACKER',d:'اختر أي لاعب وقم باللعب عنه مرة واحدة فقط.',g:'بطاقات سوداء'});
def('b_royal',{t:'action',a:'royal',black:true,n:'مرسوم ملكي!!',d:'إجعل هذه البطاقة أي بطاقة موجودة في اللعبة (بشرط أن لا تكون من البطاقات السوداء).',g:'بطاقات سوداء'});
def('b_nuke',{t:'action',a:'nuke',black:true,n:'NUKE',d:'إحرق أي مجموعة من جميع اللاعبين لحرقها حتى المجموعات التي تتضمن شبوك.',g:'بطاقات سوداء'});
def('b_gameover',{t:'action',a:'gameover',black:true,n:'GAME OVER',d:'تقوم هذه البطاقة برفض أي أمر، ويمكن أن تدافع بها عن أي لاعب (لا ترفض البطاقات السوداء).',g:'بطاقات سوداء'});
def('b_takhsi',{t:'action',a:'takhsi',black:true,n:'تخسسسي',d:'لرفض أي أمر، ورفض بطاقات الرفض لجعل أمرك منفذاً، حتى الأوامر السوداء.',g:'بطاقات سوداء'});
// ---- missions
[['q_thalatheen','m_bk','إجمع مجموعة شارع الثلاثين (الأسود)'],['q_moab','m_moab','إستخدم بطاقة M.O.A.B نفسها (يمنع استخدام المرسوم الملكي) - لابد من تنفيذ الأمر'],
 ['q_jokerfence','m_jf','إجمع مجموعة وأضف عليها جوكر وشبوك'],['q_16','m_16','إجمع 16 أرض في ساحتك'],['q_suwailem','m_db','إجمع مجموعة شارع السويلم (الأزرق الغامق)'],
 ['q_royalnap','m_rn','إستخدم بطاقة المرسوم الملكي غفوة (لابد من تنفيذ الأمر)'],['q_blackrest','m_bkrs','إجمع مجموعة من اللون الأسود ومجموعة من المطاعم'],
 ['q_purple','m_stealpu','إزرف المجموعة البنفسجية'],['q_greenst','m_grst','إجمع مجموعة من اللون الأخضر ومجموعة من المحطات'],['q_yellowgreen','m_yegr','إجمع مجموعة من اللون الأصفر ومجموعة من اللون الأخضر'],
 ['q_browngray','m_brgy','إجمع مجموعة من اللون البني واللون الرمادي'],['q_redyellow','m_reye','إجمع مجموعة من اللون الأحمر ومجموعة من اللون الأصفر'],['q_buildings','m_bld','إجمع أي مجموعة وأضف عليها قصر وبيت وفندق'],
 ['q_orangepurple','m_orpu','إجمع مجموعة من اللون البرتقالي ومجموعة من اللون البنفسجي'],['q_nuke','m_nuke','إستخدم بطاقة NUKE (لابد من تنفيذ الأمر - لابد حرق مجموعة على الأقل)'],
 ['q_restst','m_rsst','إجمع مجموعة من المطاعم ومجموعة من المحطات'],['q_bank60','m_bank60','إجمع في البنك مبلغ قيمة 60 مليون (بطاقة الفيزا لا تحقق المهمة)'],
 ['q_redorange','m_reor','إجمع مجموعة من اللون الأحمر ومجموعة من اللون البرتقالي'],['q_2rest','m_2rs','إجمع مجموعتين من المطاعم'],['q_stlb','m_stlb','إجمع مجموعة من المحطات ومجموعة من اللون الأزرق الفاتح'],
].forEach(([id,m,n])=>def(id,{t:'mission',m,n:'مهمة',d:n,g:'مهام'}));

const RESP=['takhsi','gameover','playaway','taateel','layikthar','nothing','haza','bordga','right','left','aks','asfeq','shofghairi','loading','jibha','payforme','change'];
const PAY_ACTIONS=['rent','rentwild','rentgold','cash','tax','pay5','spit','eslahat','rusoom'];
const SINGLE=['rentwild','jail','bank','getjoker','atni','eslahat','swapset','mazharia','pay5','sader','takecard','stealset','moab','rusoom','spit','ebla','estiqaad','tax','stealland','nap','darb','confiscate','swaphand','peek','tactic','hacker','give'];
const GROUP=['rent','rentgold','cash','dabatni','theeb','boom','nuke','auction'];
const SELF=['barrier','slow','emp','reverse','yaweel','draw2','kharab','moves2','box','luck','fast','again','newhand','copy','burn'];
const MULTABLE=['rent','rentwild','rentgold','tax','spit'];
const DEFAULT_RULES={moves:3,draw:2,drawEmpty:5,handLimit:7,winSets:6,jailTurns:3,jailFee:2,timeout:60};

const T=i=>i.split('.')[0];
const C=i=>CARDS[T(i)]||{id:'x',n:'بطاقة مخفية',t:'hidden',v:0,g:''};
const now=()=>Date.now();
function shuffle(a,rnd){for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function rng(seed){let s=seed>>>0||1;return()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296;};}
function R(S){S.seed=((S.seed||7)*1103515245+12345)>>>0;return S.seed/4294967296;}
function nm(S,u){const p=S.players.find(x=>x.id===u);return p?p.name:'؟';}
function cn(i){return C(i).n;}
function shown(S,u,cards,kind,text){S.evn=(S.evn||0)+1;(S.evs=S.evs||[]).push({n:S.evn,u,c:cards.slice(0,4),k:kind,t:text});if(S.evs.length>8)S.evs.splice(0,S.evs.length-8);}
function log(S,m,kind){S.log.push({t:now(),m,k:kind||''});if(S.log.length>70)S.log.splice(0,S.log.length-70);}
function cardVal(i){const c=C(i);return c.v||0;}

// ---- table helpers
function colorsOf(p){const m={};for(const l of p.lands){(m[l.c]=m[l.c]||[]).push(l.i);}return m;}
function setInfo(p){const m=colorsOf(p),o={};for(const c in m){const size=COLORS[c].size,n=m[c].length,sets=Math.floor(n/size);o[c]={n,size,sets,inSet:m[c].slice(0,sets*size),loose:m[c].slice(sets*size)};}return o;}
function looseLands(p){const o=setInfo(p),r=[];for(const c in o)r.push(...o[c].loose);return r;}
function inSetLands(p){const o=setInfo(p),r=[];for(const c in o)r.push(...o[c].inSet);return r;}
function completeColors(p){const o=setInfo(p);return Object.keys(o).filter(c=>o[c].sets>0);}
function fenced(p,c){return (p.bld[c]||[]).some(i=>C(i).b==='fence');}
function missionsDone(p){return p.miss.filter(m=>m.done).length;}
function setsCount(p){const o=setInfo(p);let s=0;for(const c in o)s+=o[c].sets;return s;}
function score(p){return setsCount(p)+missionsDone(p);}
function bankMoney(p){return p.bank.reduce((s,i)=>s+cardVal(i),0);}
function hasVisa(p){return p.bank.some(i=>T(i)==='visa');}
function rentOf(p,c){const o=setInfo(p)[c];if(!o)return 0;const k=Math.min(o.n,o.size);let r=COLORS[c].rent[k-1];if(o.sets>0)for(const b of (p.bld[c]||[]))r+=C(b).bonus||0;return r;}
function landOwner(S,i){for(const u in S.P)if(S.P[u].lands.some(l=>l.i===i))return u;return null;}
function removeLand(p,i){const k=p.lands.findIndex(l=>l.i===i);if(k<0)return null;return p.lands.splice(k,1)[0];}
function fixBuildings(S,u){const p=S.P[u];const full=completeColors(p);for(const c of Object.keys(p.bld)){if(!p.bld[c].length){delete p.bld[c];continue;}if(full.includes(c))continue;const list=p.bld[c];delete p.bld[c];for(const b of list){const bt=C(b).b;const tgt=full.find(x=>!(p.bld[x]||[]).some(y=>C(y).b===bt)&&!(NO_BUILD.includes(x)&&bt!=='fence')&&(bt!=='hotel'||(p.bld[x]||[]).some(y=>C(y).b==='house')));if(tgt){(p.bld[tgt]=p.bld[tgt]||[]).push(b);log(S,`نُقل ${cn(b)} الخاص بـ ${nm(S,u)} إلى مجموعة ${COLORS[tgt].n}`);}else{p.hand.push(b);log(S,`رجع ${cn(b)} إلى يد ${nm(S,u)}`);}}}}
function moveSet(S,fromU,toU,c){const a=S.P[fromU],b=S.P[toU];const o=setInfo(a)[c];const take=o.inSet.slice(0,o.size);for(const i of take){const l=removeLand(a,i);b.lands.push(l);}const bl=a.bld[c]||[];if(bl.length&&setInfo(a)[c]&&setInfo(a)[c].sets>0){/* still has another set of same color: keep buildings */}else{delete a.bld[c];(b.bld[c]=b.bld[c]||[]).push(...bl);}fixBuildings(S,fromU);fixBuildings(S,toU);}
function burnSet(S,u,c){const a=S.P[u];const o=setInfo(a)[c];const take=o.inSet.slice(0,o.size);for(const i of take){removeLand(a,i);S.discard.push(i);}if(!(setInfo(a)[c]&&setInfo(a)[c].sets>0)){for(const b of (a.bld[c]||[]))S.discard.push(b);delete a.bld[c];}fixBuildings(S,u);}
function draw(S,u,n){const p=S.P[u];let got=0;for(let k=0;k<n;k++){if(!S.deck.length){if(!S.discard.length)break;S.deck=shuffle(S.discard.splice(0),()=>R(S));log(S,'تم خلط البطاقات المحروقة وإعادتها إلى كومة السحب');}p.hand.push(S.deck.pop());got++;}return got;}
function drawMission(S,u){if(!S.mdeck.length)return false;S.P[u].miss.push({i:S.mdeck.pop(),done:false});return true;}
function others(S,u){return S.order.filter(x=>x!==u);}
function seatNeighbor(S,u,side){const o=S.order;const k=o.indexOf(u);return o[(k+(side==='right'?1:-1)+o.length)%o.length];}

// ---- missions
function checkMission(S,u,m,ev){const p=S.P[u];const full=completeColors(p),o=setInfo(p);const has=c=>full.includes(c);
 switch(m){case 'm_bk':return has('bk');case 'm_db':return has('db');case 'm_bkrs':return has('bk')&&has('rs');case 'm_grst':return has('gr')&&has('st');case 'm_yegr':return has('ye')&&has('gr');case 'm_brgy':return has('br')&&has('gy');case 'm_reye':return has('re')&&has('ye');case 'm_orpu':return has('or')&&has('pu');case 'm_rsst':return has('rs')&&has('st');case 'm_reor':return has('re')&&has('or');case 'm_stlb':return has('st')&&has('lb');
 case 'm_2rs':return (o.rs&&o.rs.sets>=2);case 'm_16':return p.lands.length>=16;case 'm_bank60':return bankMoney(p)>=60;
 case 'm_bld':return full.some(c=>{const t=(p.bld[c]||[]).map(i=>C(i).b);return t.includes('house')&&t.includes('hotel')&&t.includes('castle');});
 case 'm_jf':return full.some(c=>fenced(p,c)&&o[c].inSet.some(i=>T(i)==='joker'));
 default:return !!(ev&&ev[m]);}}
function checkMissions(S,u,ev){const p=S.P[u];for(const ms of p.miss){if(ms.done)continue;if(checkMission(S,u,C(ms.i).m,ev)){ms.done=true;log(S,`🎯 ${nm(S,u)} أنجز مهمة: ${C(ms.i).d}`,'good');}}}
function checkWin(S){if(S.status!=='playing')return;for(const u of S.order)checkMissions(S,u);const start=S.order.indexOf(S.turn.p);for(let k=0;k<S.order.length;k++){const u=S.order[(start+k)%S.order.length];if(score(S.P[u])>=S.cfg.winSets){S.status='ended';S.winner=u;S.endedAt=now();S.pending=null;log(S,`🏆 فاز ${nm(S,u)} بعد جمع ${score(S.P[u])} مجموعات`,'good');return;}}}

// ---- game lifecycle
function newGame(code,host,name,cfg){return{code,v:0,status:'lobby',host,created:now(),players:[{id:host,name}],cfg:Object.assign({},DEFAULT_RULES,cfg&&cfg.rules||{}),counts:(cfg&&cfg.counts)||{},maxP:6,log:[],seed:(Math.random()*4e9)>>>0};}
function startGame(S){const ids=[];for(const id in CARDS){const c=CARDS[id];if(c.t==='mission')continue;const cnt=S.counts[id]!=null?S.counts[id]:c.cnt;for(let k=0;k<cnt;k++)ids.push(id+'.'+k);}
 const ms=Object.keys(CARDS).filter(id=>CARDS[id].t==='mission').flatMap(id=>{const cnt=S.counts[id]!=null?S.counts[id]:1;return Array.from({length:cnt},(_,k)=>id+'.'+k);});
 S.deck=shuffle(ids,()=>R(S));S.mdeck=shuffle(ms,()=>R(S));S.discard=[];S.order=shuffle(S.players.map(p=>p.id),()=>R(S));S.P={};
 for(const u of S.order){S.P[u]={hand:[],bank:[],lands:[],bld:{},miss:[],st:{nap:0,jail:0,jailBy:null,ebla:0,estq:0,barrier:0,bordga:null,tactic:0,open:0}};draw(S,u,5);drawMission(S,u);}
 S.evs=[];S.evn=0;S.status='playing';S.startedAt=now();S.dir=1;S.tc=0;S.fx={slow:0,fast:0,emp:0};S.deferred=[];S.hack=null;S.reveal={};S.lastOrder=null;S.pending=null;S.winner=null;S.idx=0;S.log=[];
 log(S,`بدأت المباراة. الترتيب: ${S.order.map(u=>nm(S,u)).join(' ← ')}`);beginTurn(S,S.order[0]);}
function beginTurn(S,u){S.tc++;const p=S.P[u];S.turn={p:u,phase:'draw',moves:S.cfg.moves,used:0,unl:false,again:false,ctrl:(S.hack&&S.hack.of===u)?S.hack.by:u};
 if(p.st.nap>0){p.st.nap--;log(S,`😴 ${nm(S,u)} في غفوة، تم تخطي دوره`);return endTurn(S,true);}
 if(p.st.jail>0){S.turn.phase='jail';return;}
 if(S.turn.ctrl!==u)log(S,`💀 ${nm(S,S.turn.ctrl)} يلعب بدلاً من ${nm(S,u)} هذا الدور`,'bad');}
function drawCountFor(S,u){const p=S.P[u];let n=p.hand.length===0?S.cfg.drawEmpty:S.cfg.draw;if(p.st.estq>0)n=1;if(S.fx.slow>S.tc||S.fx.emp>S.tc)n=1;return n;}
function doDraw(S,u){const p=S.P[u];const n=drawCountFor(S,u);if(p.st.estq>0)p.st.estq--;draw(S,u,n);log(S,`${nm(S,u)} سحب ${n} ${n===1?'بطاقة':'بطاقات'}`);
 if(p.hand.length>S.cfg.handLimit){const ex=p.hand.length-S.cfg.handLimit;for(let k=0;k<ex;k++){const j=Math.floor(R(S)*p.hand.length);S.discard.push(p.hand.splice(j,1)[0]);}log(S,`🔥 حُرقت ${ex} بطاقة عشوائية من يد ${nm(S,u)} لتجاوز الحد (${S.cfg.handLimit})`);}
 let mv=S.cfg.moves;if(p.st.ebla>0){mv=1;p.st.ebla--;}if(p.st.tactic>0){mv=1;p.st.tactic--;}if(S.fx.fast>S.tc||S.fx.emp>S.tc)mv=1;S.turn.moves=mv;S.turn.phase='play';openDeferred(S);}
function openDeferred(S){if(S.pending||S.status!=='playing')return;const u=S.turn.p;const k=S.deferred.findIndex(d=>d.queue[0]===u);if(k<0){if(S.turn.phase==='play'&&S.P[u].st.nap>0&&S.turn.napNow){S.P[u].st.nap--;log(S,`😴 ${nm(S,u)} أخذ الغفوة بعد التأجيل`);endTurn(S,true);}return;}
 const d=S.deferred.splice(k,1)[0];d.noLoading=true;d.dl=now()+S.cfg.timeout*1000;S.pending=d;log(S,`⏳ وصل الأمر المؤجَّل (${d.label}) إلى ${nm(S,u)}`);openTarget(S);}
function endTurn(S,skip){const u=S.turn.p;if(S.hack&&S.hack.of===u&&!skip)S.hack=null;if(!skip&&S.turn.again){S.turn.again=false;log(S,`🔁 ${nm(S,u)} يلعب مرة أخرى`);return beginTurn(S,u);}
 const o=S.order;let k=o.indexOf(u);k=(k+S.dir+o.length)%o.length;beginTurn(S,o[k]);}
function movesLeft(S){return S.turn.unl?99:S.turn.moves-S.turn.used;}

// ---- pending / responses
function label(a,cardIid){return cardIid?cn(cardIid):a;}
function needSel(a){return({stealland:'loose',confiscate:'loose',atni:'loose',theeb:'loose',boom:'loose',auction:'loose',darb:'anyland',getjoker:'joker',stealset:'set',sader:'set',swapset:'set',nuke:'setany'})[a]||null;}
function selOptions(S,a,from,t){const p=S.P[t];const k=needSel(a);if(!k)return null;
 if(k==='loose')return looseLands(p);
 if(k==='anyland'){const fc=completeColors(p).filter(c=>fenced(p,c));const o=setInfo(p);return p.lands.map(l=>l.i).filter(i=>{const l=p.lands.find(x=>x.i===i);return !(fc.includes(l.c)&&o[l.c].inSet.includes(i));});}
 if(k==='joker'){const o=setInfo(p);return p.lands.filter(l=>T(l.i)==='joker'&&!(fenced(p,l.c)&&o[l.c].inSet.includes(l.i))).map(l=>l.i);}
 if(k==='set')return completeColors(p).filter(c=>!fenced(p,c));
 if(k==='setany')return completeColors(p);}
function selValid(S,pd,t){const k=needSel(pd.a);if(!k)return true;const s=pd.sel&&pd.sel[t];const opts=selOptions(S,pd.a,pd.from,t);if(pd.a==='swapset'&&!completeColors(S.P[pd.from]).filter(c=>!fenced(S.P[pd.from],c)).includes(pd.mine))return false;if(pd.a==='atni'&&!looseLands(S.P[pd.from]).includes(pd.mine))return false;return s!=null&&opts.includes(s);}
function targetHasStuff(S,pd,t){const k=needSel(pd.a);if(k)return selOptions(S,pd.a,pd.from,t).length>0;if(pd.a==='swaphand')return S.P[t].hand.length>0;if(pd.a==='takecard')return S.P[t].hand.length>0;return true;}
function makePending(S,from,a,cards,extra){const pd=Object.assign({id:Math.random().toString(36).slice(2,9),a,from,benef:from,cards,black:cards.some(i=>C(i).black),queue:[],sel:{},stage:'respond',dl:now()+S.cfg.timeout*1000,label:cn(cards[0]),lots:[],burned:0,orig:from},extra||{});return pd;}
function openTarget(S){const pd=S.pending;while(pd&&pd.queue.length){const t=pd.queue[0];const p=S.P[t];pd.dl=now()+S.cfg.timeout*1000;
  if(!pd.black&&p.st.barrier>S.tc){log(S,`🛡️ ${nm(S,t)} محمي بالحاجز من ${pd.label}`);pd.queue.shift();continue;}
  if(!pd.black&&p.st.bordga&&p.st.bordga.from===pd.from&&p.st.bordga.tc===S.tc){log(S,`🛡️ ${nm(S,t)} محمي بـ BORDGA`);pd.queue.shift();continue;}
  if(needSel(pd.a)&&!selValid(S,pd,t)){if(targetHasStuff(S,pd,t)&&pd.a!=='theeb'&&pd.a!=='boom'&&pd.a!=='auction'&&pd.a!=='nuke'){pd.stage='reselect';return;}log(S,`${nm(S,t)} لا يملك ما يمكن أخذه بـ ${pd.label}`);pd.queue.shift();continue;}
  if(!targetHasStuff(S,pd,t)){log(S,`${nm(S,t)} لا يملك ما يتأثر بـ ${pd.label}`);pd.queue.shift();continue;}
  pd.stage='respond';pd.refuser=null;return;}
 if(pd)finishPending(S);}
function nextTarget(S){S.pending.queue.shift();openTarget(S);}
function finishPending(S){const pd=S.pending;S.pending=null;
 if(pd.a==='auction'&&pd.lots.length){S.pending=pd;pd.stage='bid';pd.lot=0;pd.bids={};pd.dl=now()+S.cfg.timeout*1000;log(S,`🔨 بدأ المزاد على ${pd.lots.length} أرض`);return;}
 if(pd.a==='theeb')S.P[pd.orig].st.nap+=1;
 const ev={};if(pd.a==='moab'&&pd.executed&&!pd.royal)ev.m_moab=1;if(pd.a==='nuke'&&pd.burned>0)ev.m_nuke=1;if(pd.royal&&pd.a==='nap'&&pd.executed)ev.m_rn=1;
 if(pd.stolePurple)ev.m_stealpu=1;checkMissions(S,pd.orig,ev);if(pd.stolePurple)checkMissions(S,pd.benef,{m_stealpu:1});checkWin(S);if(S.status==='playing'&&S.turn.phase==='play')openDeferred(S);}
function respOK(S,pd,who,a){const t=pd.queue[0];const isT=who===t;const pay=PAY_ACTIONS.includes(pd.a);
 if(pd.stage==='counter')return who===pd.from&&a==='takhsi';
 if(pd.stage!=='respond')return false;
 if(who===pd.from)return false;
 if(pd.black)return a==='takhsi'&&isT;
 if(!isT)return a==='taateel'||a==='gameover';
 if(pd.a==='auction')return ['takhsi','playaway','taateel','gameover'].includes(a);
 switch(a){case 'takhsi':case 'gameover':case 'playaway':case 'taateel':return true;
  case 'bordga':return true;
  case 'layikthar':return ['rent','rentwild','rentgold'].includes(pd.a);
  case 'nothing':return pay;case 'jibha':return pay;case 'payforme':return pay&&S.order.length>2;
  case 'haza':return pay&&!hasVisa(S.P[t])&&payAmount(S,pd,t)>bankMoney(S.P[t]);
  case 'right':case 'left':return S.order.length>2;case 'aks':return SINGLE.includes(pd.a);
  case 'asfeq':return S.order.length>2;case 'shofghairi':return true;case 'loading':return !pd.noLoading;
 }return false;}
function payAmount(S,pd,t){const m=pd.mult||1;switch(pd.a){case 'rent':case 'rentwild':return rentOf(S.P[pd.rentOwner||pd.benef],pd.color)*m;case 'rentgold':return rentOf(S.P[pd.rentOwner],pd.color)*m;
 case 'cash':return 2;case 'tax':return 3*m;case 'pay5':return 5;case 'spit':return 13*m;
 case 'eslahat':{const p=S.P[t];let s=0;s+=3*setsCount(p);for(const c in p.bld)for(const b of p.bld[c]){const bt=C(b).b;s+=bt==='fence'?2:1;}s+=2*p.lands.filter(l=>T(l.i)==='joker').length;return s;}
 case 'rusoom':return looseLands(S.P[t]).length;}return 0;}
function payable(p){return p.bank.filter(i=>T(i)!=='visa').concat(looseLands(p));}
function minCover(items,need){if(need<=0)return [];if(!items.length)return [];const lim=Math.min(items.length,14);let best=null,bs=1e9;for(let mask=1;mask<(1<<lim);mask++){let sm=0;for(let k=0;k<lim;k++)if(mask&(1<<k))sm+=cardVal(items[k]);if(sm>=need&&sm<bs){bs=sm;best=mask;}}if(best==null)return items.slice();const r=[];for(let k=0;k<lim;k++)if(best&(1<<k))r.push(items[k]);return r;}
function autoPick(S,u,amt){const p=S.P[u];const money=p.bank.filter(i=>T(i)!=='visa').sort((a,b)=>cardVal(a)-cardVal(b));const lands=looseLands(p).sort((a,b)=>cardVal(a)-cardVal(b));const mt=money.reduce((s,i)=>s+cardVal(i),0);if(mt>=amt)return minCover(money,amt);return money.concat(minCover(lands,amt-mt));}
function doPay(S,payer,payee,cards,opts){const a=S.P[payer],b=S.P[payee];opts=opts||{};
 if(opts.visa){const k=a.bank.findIndex(i=>T(i)==='visa');if(k<0)return 'لا تملك فيزا';b.bank.push(a.bank.splice(k,1)[0]);log(S,`💳 ${nm(S,payer)} سدّد بالفيزا وانتقلت إلى بنك ${nm(S,payee)}`);return null;}
 if(hasVisa(a)&&opts.amount>a.bank.filter(i=>T(i)!=='visa').reduce((s,i)=>s+cardVal(i),0))return doPay(S,payer,payee,[],{visa:true});
 const pool=payable(a);for(const i of cards)if(!pool.includes(i))return 'بطاقة غير صالحة للدفع';const sum=cards.reduce((s,i)=>s+cardVal(i),0);const amt=opts.amount;
 if(new Set(cards).size!==cards.length)return 'بطاقة مكررة';
 const cash=a.bank.filter(i=>T(i)!=='visa');const cashTot=cash.reduce((s,i)=>s+cardVal(i),0);const uLand=cards.filter(i=>!a.bank.includes(i)),uBank=cards.filter(i=>a.bank.includes(i));
 if(uLand.length&&cashTot>=amt)return 'البنك يكفي للدفع، والأراضي ما تُستخدم إلا إذا ما كفى البنك';
 if(uLand.length&&uBank.length<cash.length)return 'لازم تدفع كل أموال البنك أولاً، وبعدها تكمّل بالأراضي';
 if(sum<amt&&cards.length<pool.length)return `المبلغ المختار ${sum}M أقل من المطلوب ${amt}M`;
 for(const i of cards){const k=a.bank.indexOf(i);if(k>=0){b.bank.push(a.bank.splice(k,1)[0]);}else{const l=removeLand(a,i);b.lands.push(l);}}
 fixBuildings(S,payer);if(cards.length)shown(S,payer,cards,'pay',`${nm(S,payer)} دفع ${sum}M لـ ${nm(S,payee)}`);log(S,`💸 ${nm(S,payer)} دفع ${sum}M لـ ${nm(S,payee)}${cards.length?' ('+cards.map(cn).join('، ')+')':' (لا يملك شيئاً)'}`);
 if(opts.change&&sum>amt){const ci=a.hand.findIndex(i=>C(i).a==='change');if(ci>=0){S.discard.push(a.hand.splice(ci,1)[0]);let over=sum-amt;const back=[];const mon=b.bank.filter(i=>T(i)!=='visa').sort((x,y)=>cardVal(y)-cardVal(x));for(const i of mon){if(cardVal(i)<=over){over-=cardVal(i);back.push(i);}if(!over)break;}
   for(const i of back){b.bank.splice(b.bank.indexOf(i),1);a.bank.push(i);}if(over>0){for(const i of looseLands(b).sort((x,y)=>cardVal(y)-cardVal(x))){if(over<=0)break;const l=removeLand(b,i);a.lands.push(l);over-=cardVal(i);back.push(i);}}
   log(S,`💵 وين الباقي؟ ${nm(S,payee)} أرجع ${back.length?back.map(cn).join('، '):'لا شيء (لا يملك)'} إلى ${nm(S,payer)}`);fixBuildings(S,payee);}}
 return null;}
function applyAccept(S){const pd=S.pending,t=pd.queue[0],from=pd.benef,P=S.P;pd.executed=true;
 if(PAY_ACTIONS.includes(pd.a)){const amt=payAmount(S,pd,t);if(amt<=0||(!payable(P[t]).length&&!hasVisa(P[t]))){log(S,`${nm(S,t)} لا يملك ما يدفعه (${amt}M)`);return nextTarget(S);}pd.stage='pay';pd.pay={payer:t,payee:from,amount:amt};return;}
 const s=pd.sel[t];
 switch(pd.a){
 case 'dabatni':if(!looseLands(P[t]).length){log(S,`${nm(S,t)} لا يملك أرضاً خارج المجموعات`);return nextTarget(S);}pd.stage='choose';return;
 case 'stealland':case 'theeb':case 'darb':case 'getjoker':{const l=removeLand(P[t],s);P[from].lands.push(l);fixBuildings(S,t);log(S,`🦊 ${nm(S,from)} أخذ ${cn(s)} من ${nm(S,t)}`);break;}
 case 'confiscate':case 'boom':{removeLand(P[t],s);S.discard.push(s);fixBuildings(S,t);log(S,`🔥 احترقت ${cn(s)} من ساحة ${nm(S,t)}`);break;}
 case 'atni':{const a=removeLand(P[t],s),b=removeLand(P[from],pd.mine);P[from].lands.push(a);P[t].lands.push(b);log(S,`🔄 ${nm(S,from)} بدّل ${cn(pd.mine)} مقابل ${cn(s)} من ${nm(S,t)}`);break;}
 case 'stealset':{moveSet(S,t,from,s);if(s==='pu')pd.stolePurple=true;log(S,`🦊 ${nm(S,from)} زرف مجموعة ${COLORS[s].n} من ${nm(S,t)}`,'bad');break;}
 case 'swapset':{const mine=pd.mine;const tmp='__';moveSet(S,t,from,s);moveSet(S,from,t,mine);if(s==='pu')pd.stolePurple=true;log(S,`🔄 ${nm(S,from)} بدّل مجموعته ${COLORS[mine].n} بمجموعة ${COLORS[s].n} من ${nm(S,t)}`);break;}
 case 'sader':case 'nuke':{burnSet(S,t,s);pd.burned++;log(S,`☢️ احترقت مجموعة ${COLORS[s].n} الخاصة بـ ${nm(S,t)}`,'bad');break;}
 case 'moab':{const ls=looseLands(P[t]);for(const i of ls){removeLand(P[t],i);S.discard.push(i);}fixBuildings(S,t);log(S,`💣 M.O.A.B أحرق ${ls.length} أرض من ساحة ${nm(S,t)}`,'bad');break;}
 case 'bank':{const b=P[t].bank.splice(0);P[from].bank.push(...b);log(S,`🏦 ${nm(S,from)} زرف بنك ${nm(S,t)} (${b.length} بطاقة)`,'bad');break;}
 case 'jail':P[t].st.jail=S.cfg.jailTurns;P[t].st.jailBy=from;log(S,`🚔 ${nm(S,t)} دخل السجن`);break;
 case 'nap':P[t].st.nap+=1;if(S.turn.p===t&&S.turn.phase==='play'&&pd.noLoading)S.turn.napNow=true;log(S,`😴 ${nm(S,t)} أخذ غفوة`);break;
 case 'ebla':P[t].st.ebla=3;log(S,`${nm(S,t)} سيلعب حركة واحدة فقط لمدة 3 دورات`);break;
 case 'tactic':P[t].st.tactic=1;log(S,`${nm(S,t)} سيلعب حركة واحدة فقط في دوره القادم`);break;
 case 'estiqaad':P[t].st.estq=3;log(S,`${nm(S,t)} سيسحب بطاقة واحدة فقط لمدة 3 دورات`);break;
 case 'swaphand':{const x=P[t].hand;P[t].hand=P[from].hand;P[from].hand=x;log(S,`🔄 ${nm(S,from)} بدّل الورق مع ${nm(S,t)}`);break;}
 case 'takecard':{const j=Math.floor(R(S)*P[t].hand.length);P[from].hand.push(P[t].hand.splice(j,1)[0]);log(S,`✋ ${nm(S,from)} أخذ بطاقة من يد ${nm(S,t)}`);break;}
 case 'peek':S.reveal[from]={hand:t,until:S.tc};log(S,`🔍 ${nm(S,from)} يكشف أوراق ${nm(S,t)}`);break;
 case 'mazharia':P[t].st.open=S.tc+S.order.length;log(S,`🌼 أوراق ${nm(S,t)} مكشوفة للجميع لدورة كاملة`);break;
 case 'hacker':S.hack={by:pd.from,of:t};log(S,`💀 ${nm(S,pd.from)} سيلعب دور ${nm(S,t)} القادم`,'bad');break;
 case 'auction':{const l=removeLand(P[t],s);fixBuildings(S,t);pd.lots.push({i:l.i,c:l.c,o:t});log(S,`🔨 دخلت ${cn(s)} من ${nm(S,t)} المزاد`);break;}
 }
 nextTarget(S);}
function stageActor(S){const pd=S.pending;if(!pd)return null;const t=pd.queue[0];switch(pd.stage){case 'respond':return t;case 'counter':return pd.from;case 'pay':return pd.pay.payer;case 'choose':return t;case 'retarget':case 'reselect':return pd.from;case 'payfor':return t;}return null;}

// ---- main dispatcher
function act(S,u,op){
 const P=S.P;const T_=S.turn;
 if(op.type==='join'){if(S.status!=='lobby')return 'المباراة بدأت بالفعل';if(S.players.some(p=>p.id===u)){S.players.find(p=>p.id===u).name=op.name;return null;}if(S.players.length>=S.maxP)return 'الغرفة ممتلئة';S.players.push({id:u,name:op.name});log(S,`👋 انضم ${op.name}`);return null;}
 if(op.type==='leave'){if(S.status!=='lobby')return 'لا يمكن مغادرة مباراة جارية';S.players=S.players.filter(p=>p.id!==u);if(S.host===u&&S.players.length)S.host=S.players[0].id;log(S,`غادر لاعب الغرفة`);return null;}
 if(op.type==='settings'){if(u!==S.host)return 'الإعدادات للمضيف فقط';if(S.status!=='lobby')return 'لا يمكن التعديل أثناء اللعب';if(op.winSets)S.cfg.winSets=Math.max(1,Math.min(12,op.winSets|0));if(op.maxP)S.maxP=Math.max(2,Math.min(6,op.maxP|0));return null;}
 if(op.type==='start'){if(u!==S.host)return 'البدء للمضيف فقط';if(S.players.length<2)return 'يلزم لاعبان على الأقل';startGame(S);return null;}
 if(op.type==='restart'){if(u!==S.host)return 'للمضيف فقط';S.status='lobby';S.pending=null;return null;}
 if(op.type==='kick'){if(u!==S.host||S.status!=='lobby')return 'غير مسموح';S.players=S.players.filter(p=>p.id!==op.who);return null;}
 if(S.status!=='playing')return 'المباراة غير جارية';
 if(op.type==='timeout')return doTimeout(S);
 const pd=S.pending;
 // ----- pending interactions
 if(pd){
  if(op.type==='bid'){if(pd.stage!=='bid')return 'لا يوجد مزاد';if(u===pd.from)return 'صاحب الأمر لا يشارك في المزاد';const amt=Math.max(0,op.amount|0);if(amt>0&&!hasVisa(P[u])&&amt>bankMoney(P[u]))return `رصيدك ${bankMoney(P[u])}M لا يكفي`;pd.bids[u]=amt;if(others(S,pd.from).every(x=>pd.bids[x]!=null))closeLot(S);return null;}
  const actor=stageActor(S);
  if(op.type==='respond'){const ci=op.card;const owner=u;if(!P[owner].hand.includes(ci))return 'البطاقة ليست في يدك';const a=C(ci).a;if(!respOK(S,pd,owner,a))return 'لا يمكن استخدام هذه البطاقة للرد هنا';return doRespond(S,owner,ci,a,op);}
  if(u!==actor&&!(pd.stage==='respond'&&op.type==='accept'&&false))return 'ليس دورك في الرد';
  switch(op.type){
   case 'accept':if(pd.stage!=='respond')return 'خطأ';log(S,`${nm(S,u)} قبل ${pd.label}`);applyAccept(S);return null;
   case 'pass':if(pd.stage!=='counter')return 'خطأ';log(S,`${nm(S,pd.from)} قبل الرفض`);nextTarget(S);return null;
   case 'pay':{if(pd.stage!=='pay')return 'خطأ';const pay=pd.pay;const e=doPay(S,pay.payer,pay.payee,op.cards||[],{amount:pay.amount,visa:op.visa,change:op.change});if(e)return e;nextTarget(S);return null;}
   case 'choose':{if(pd.stage!=='choose')return 'خطأ';const t=pd.queue[0];if(!looseLands(P[t]).includes(op.land))return 'اختر أرضاً خارج المجموعات';const l=removeLand(P[t],op.land);P[pd.benef].lands.push(l);fixBuildings(S,t);log(S,`${nm(S,t)} أعطى ${cn(op.land)} لـ ${nm(S,pd.benef)}`);nextTarget(S);return null;}
   case 'retarget':{if(pd.stage!=='retarget')return 'خطأ';if(op.t===pd.from||pd.excl.includes(op.t)||!S.order.includes(op.t))return 'اختر لاعباً آخر';pd.queue[0]=op.t;pd.sel={};log(S,`${nm(S,pd.from)} وجّه ${pd.label} إلى ${nm(S,op.t)}`);openTarget(S);return null;}
   case 'reselect':{if(pd.stage!=='reselect')return 'خطأ';const t=pd.queue[0];pd.sel[t]=op.sel;if(op.mine!=null)pd.mine=op.mine;if(!selValid(S,pd,t))return 'اختيار غير صالح';openTarget(S);return null;}
   case 'giveup':{if(pd.stage!=='reselect')return 'خطأ';nextTarget(S);return null;}
  }
  return 'يوجد أمر قيد الانتظار';
 }
 // ----- turn ops
 if(op.type==='jailPay'||op.type==='jailWait'||op.type==='jailBroke'){if(T_.ctrl!==u||T_.phase!=='jail')return 'ليس دورك';const me=T_.p,p=P[me];
  if(op.type==='jailWait'){p.st.jail--;log(S,`🚔 ${nm(S,me)} بقي في السجن (${p.st.jail} متبقية)`);if(p.st.jail<=0)p.st.jailBy=null;endTurn(S,true);return null;}
  if(op.type==='jailPay'){const by=p.st.jailBy&&P[p.st.jailBy]?p.st.jailBy:null;const amt=S.cfg.jailFee;const pool=payable(p);if(!pool.length&&!hasVisa(p))return 'لا تملك ما تدفعه';const e=by?doPay(S,me,by,op.cards||autoPick(S,me,amt),{amount:amt,visa:op.visa}):null;if(e)return e;p.st.jail=0;p.st.jailBy=null;log(S,`🔓 ${nm(S,me)} خرج من السجن`);T_.phase='draw';return null;}
  if(op.type==='jailBroke'){if(payable(p).length||hasVisa(p))return 'تملك أراضي أو بنكاً، ادفع أو انتظر';const got=[];for(let k=0;k<2;k++){if(!S.deck.length)break;got.push(S.deck.pop());}const by=p.st.jailBy;for(const i of got){const c=C(i);if((c.t==='money'||c.t==='visa')&&by)P[by].bank.push(i);else if((c.t==='land'||c.t==='dual'||c.t==='joker')&&by)P[by].lands.push({i,c:c.c||(c.cs?c.cs[0]:'lb')});else S.discard.push(i);}log(S,`🔓 ${nm(S,me)} سحب ${got.map(cn).join('، ')} للخروج من السجن`);p.st.jail=0;p.st.jailBy=null;T_.phase='play';T_.moves=S.cfg.moves;openDeferred(S);return null;}
 }
 if(T_.ctrl!==u)return 'ليس دورك';
 const me=T_.p,p=P[me];
 if(op.type==='draw'){if(T_.phase!=='draw')return 'سحبت بالفعل';doDraw(S,me);return null;}
 if(T_.phase!=='play')return 'اسحب بطاقاتك أولاً';
 if(op.type==='end'){log(S,`⏭️ ${nm(S,me)} أنهى دوره`);endTurn(S);return null;}
 if(movesLeft(S)<=0)return 'انتهت حركاتك، أنهِ الدور';
 const use=()=>{T_.used++;};
 const fromHand=i=>{const k=p.hand.indexOf(i);if(k<0)return false;p.hand.splice(k,1);return true;};
 if(op.type==='flip'){const l=p.lands.find(x=>x.i===op.land);if(!l)return 'الأرض غير موجودة';const c=C(l.i);if(c.t==='dual'){if(!c.cs.includes(op.color)||op.color===l.c)return 'لون غير صالح';}else if(c.t==='joker'){if(!COLORS[op.color]||op.color===l.c)return 'لون غير صالح';}else return 'هذه الأرض لا تُقلب';l.c=op.color;fixBuildings(S,me);use();log(S,`🔃 ${nm(S,me)} حرّك ${cn(l.i)} إلى ${COLORS[op.color].n}`);shown(S,me,[l.i],'land',`${nm(S,me)} حرّك ${cn(l.i)} إلى ${COLORS[op.color].n}`);checkWin(S);return null;}
 if(op.type==='moveBuild'){const from=Object.keys(p.bld).find(c=>p.bld[c].includes(op.card));if(!from)return 'المبنى غير موجود';const to=op.to;if(!completeColors(p).includes(to)||to===from)return 'اختر مجموعة كاملة أخرى';const bt=C(op.card).b;if(bt!=='fence'&&NO_BUILD.includes(to))return 'لا يمكن البناء على المحطات والمطاعم';if((p.bld[to]||[]).some(y=>C(y).b===bt))return 'يوجد مبنى مماثل';if(bt==='hotel'&&!(p.bld[to]||[]).some(y=>C(y).b==='house'))return 'الفندق يحتاج بيتاً';p.bld[from]=p.bld[from].filter(x=>x!==op.card);(p.bld[to]=p.bld[to]||[]).push(op.card);fixBuildings(S,me);use();log(S,`🏗️ ${nm(S,me)} نقل ${cn(op.card)} إلى ${COLORS[to].n}`);checkWin(S);return null;}
 const ci=op.card;if(!p.hand.includes(ci))return 'البطاقة ليست في يدك';const c=C(ci);
 if(op.type==='bank'){if(c.t!=='money'&&c.t!=='visa')return 'لا يوضع في البنك إلا المال والفيزا';fromHand(ci);p.bank.push(ci);use();log(S,`🏦 ${nm(S,me)} وضع ${cn(ci)} في البنك`);shown(S,me,[ci],'bank',`${nm(S,me)} وضع ${cn(ci)} في البنك`);checkWin(S);return null;}
 if(op.type==='land'){if(!['land','dual','joker'].includes(c.t))return 'ليست أرضاً';let col=c.c;if(c.t==='dual'){if(!c.cs.includes(op.color))return 'اختر أحد وجهي البطاقة';col=op.color;}if(c.t==='joker'){if(!COLORS[op.color])return 'اختر لون الجوكر';col=op.color;}fromHand(ci);p.lands.push({i:ci,c:col});use();log(S,`🏠 ${nm(S,me)} وضع ${cn(ci)} (${COLORS[col].n})`);shown(S,me,[ci],'land',`${nm(S,me)} نزّل أرض ${COLORS[col].n}`);checkWin(S);return null;}
 if(op.type==='build'){if(c.t!=='build')return 'ليست مبنى';const col=op.color;if(!completeColors(p).includes(col))return 'المبنى يضاف للمجموعة الكاملة فقط';if(c.b!=='fence'&&NO_BUILD.includes(col))return 'لا يمكن إضافة بيت أو فندق أو قصر على المطاعم والمحطات';if((p.bld[col]||[]).some(y=>C(y).b===c.b))return 'يوجد '+c.n+' على هذه المجموعة';if(c.b==='hotel'&&!(p.bld[col]||[]).some(y=>C(y).b==='house'))return 'الفندق يحتاج وجود البيت';fromHand(ci);(p.bld[col]=p.bld[col]||[]).push(ci);use();log(S,`🏗️ ${nm(S,me)} أضاف ${c.n} إلى ${COLORS[col].n}`);shown(S,me,[ci],'build',`${nm(S,me)} أضاف ${c.n} إلى مجموعة ${COLORS[col].n}`);checkWin(S);return null;}
 if(op.type==='burn'){if(c.a!=='burn')return 'اختر بطاقة إحرق';if(op.other===ci||!p.hand.includes(op.other))return 'اختر البطاقة المراد حرقها';fromHand(ci);fromHand(op.other);S.discard.push(ci,op.other);use();log(S,`🔥 ${nm(S,me)} أحرق بطاقة من يده`);shown(S,me,[ci],'play',`${nm(S,me)} أحرق بطاقة من يده`);return null;}
 if(op.type==='play')return playCard(S,me,ci,op);
 return 'عملية غير معروفة';}

function doRespond(S,u,ci,a,op){const pd=S.pending,P=S.P,t=pd.queue[0];const hand=P[u].hand;hand.splice(hand.indexOf(ci),1);S.discard.push(ci);shown(S,u,[ci],'resp',`${nm(S,u)} ردّ على ${pd.label} بـ ${cn(ci)}`);
 if(pd.stage==='counter'){log(S,`⚡ ${nm(S,u)} ردّ بـ ${cn(ci)} وألغى الرفض`,'bad');pd.stage='respond';pd.black=pd.black||false;pd.countered=true;return null;}
 const refuse=['takhsi','gameover','playaway','taateel','layikthar','nothing','haza','bordga'];
 if(refuse.includes(a)){if(a==='bordga')P[u].st.bordga={from:pd.from,tc:S.tc};const by=u===t?'':` دفاعاً عن ${nm(S,t)}`;log(S,`🛑 ${nm(S,u)} رفض ${pd.label} بـ ${cn(ci)}${by}`,'good');
  if(P[pd.from].hand.some(i=>C(i).a==='takhsi')){pd.stage='counter';pd.dl=now()+S.cfg.timeout*1000;pd.refuser=u;return null;}nextTarget(S);return null;}
 const needResel=()=>{pd.sel={};};
 if(a==='right'||a==='left'){let n=seatNeighbor(S,u,a);if(n===pd.from)n=seatNeighbor(S,n,a);if(n===u){log(S,'لا يوجد لاعب آخر');nextTarget(S);return null;}pd.queue[0]=n;needResel();log(S,`↪️ ${nm(S,u)} حوّل ${pd.label} إلى ${nm(S,n)}`);openTarget(S);return null;}
 if(a==='aks'){const old=pd.from;pd.from=u;pd.benef=u;pd.queue[0]=old;needResel();if(pd.a==='rentwild')pd.rentOwner=u;log(S,`🔁 ${nm(S,u)} عكس ${pd.label} على ${nm(S,old)}`);if(['rentwild'].includes(pd.a)&&!(setInfo(P[u])[pd.color])){log(S,`${nm(S,u)} لا يملك أرضاً من هذا اللون، لا شيء يحدث`);nextTarget(S);return null;}openTarget(S);return null;}
 if(a==='asfeq'){const n=op.to;if(!n||n===pd.from||n===u||!S.order.includes(n)){P[u].hand.push(ci);S.discard.pop();return 'اختر لاعباً غير صاحب الطلب';}pd.queue[0]=n;needResel();log(S,`👋 ${nm(S,u)} صفقها في ${nm(S,n)}`);openTarget(S);return null;}
 if(a==='shofghairi'){pd.excl=(pd.excl||[]).concat([u]);const opts=S.order.filter(x=>x!==pd.from&&!pd.excl.includes(x));log(S,`🙄 ${nm(S,u)}: شف غيري!`);if(!opts.length){log(S,`${nm(S,pd.from)} خسر الأمر لعدم توفر لاعب آخر`);nextTarget(S);return null;}pd.stage='retarget';pd.dl=now()+S.cfg.timeout*1000;return null;}
 if(a==='loading'){const d=JSON.parse(JSON.stringify(pd));d.queue=[t];d.stage='respond';S.deferred.push(d);log(S,`⏳ ${nm(S,u)} أجّل ${pd.label} إلى دوره القادم`);nextTarget(S);return null;}
 if(a==='jibha'){const amt=payAmount(S,pd,t);log(S,`💰 جبها أنت! ${nm(S,pd.benef)} يدفع لـ ${nm(S,u)}`);pd.stage='pay';pd.pay={payer:pd.benef,payee:u,amount:amt};if(!payable(P[pd.benef]).length&&!hasVisa(P[pd.benef])){log(S,`${nm(S,pd.benef)} لا يملك ما يدفعه`);nextTarget(S);}return null;}
 if(a==='payforme'){const n=op.to;if(!n||n===pd.benef||n===u||!S.order.includes(n)){P[u].hand.push(ci);S.discard.pop();return 'اختر لاعباً غير صاحب الطلب';}const amt=payAmount(S,pd,t);log(S,`🫵 ${nm(S,u)}: أقول ادفع عني يا ${nm(S,n)}`);pd.stage='pay';pd.pay={payer:n,payee:pd.benef,amount:amt};if(!payable(P[n]).length&&!hasVisa(P[n])){log(S,`${nm(S,n)} لا يملك ما يدفعه`);nextTarget(S);}return null;}
 return 'رد غير معروف';}
function closeLot(S){const pd=S.pending,P=S.P;const lot=pd.lots[pd.lot];let best=null,amt=0;for(const u of others(S,pd.from)){const b=pd.bids[u]||0;if(b>amt){amt=b;best=u;}}
 if(best){if(hasVisa(P[best])&&amt>bankMoney(P[best]))doPay(S,best,pd.from,[],{visa:true});else{const pick=autoPick(S,best,amt).filter(i=>P[best].bank.includes(i));doPay(S,best,pd.from,pick,{amount:amt});}P[best].lands.push({i:lot.i,c:lot.c});log(S,`🔨 ${nm(S,best)} فاز بـ ${cn(lot.i)} مقابل ${amt}M`,'good');}
 else{S.discard.push(lot.i);log(S,`🔥 لم يشترِ أحد ${cn(lot.i)} فاحترقت`);}
 pd.lot++;pd.bids={};pd.dl=now()+S.cfg.timeout*1000;if(pd.lot>=pd.lots.length){S.pending=null;checkMissions(S,pd.from);checkWin(S);if(S.status==='playing')openDeferred(S);}}
function doTimeout(S){const pd=S.pending;if(!pd)return 'لا يوجد ما ينتظر';if(now()<pd.dl)return 'لم تنتهِ المهلة بعد';log(S,`⌛ انتهت المهلة`);
 switch(pd.stage){case 'respond':applyAccept(S);break;case 'counter':nextTarget(S);break;case 'pay':{const pay=pd.pay;const p=S.P[pay.payer];if(hasVisa(p)&&pay.amount>bankMoney(p))doPay(S,pay.payer,pay.payee,[],{visa:true});else doPay(S,pay.payer,pay.payee,autoPick(S,pay.payer,pay.amount),{amount:pay.amount});nextTarget(S);break;}
 case 'choose':{const t=pd.queue[0];const ls=looseLands(S.P[t]).sort((a,b)=>cardVal(a)-cardVal(b));const l=removeLand(S.P[t],ls[0]);S.P[pd.benef].lands.push(l);fixBuildings(S,t);nextTarget(S);break;}
 case 'retarget':case 'reselect':nextTarget(S);break;case 'bid':for(const u of others(S,pd.from))if(pd.bids[u]==null)pd.bids[u]=0;closeLot(S);break;}return null;}

function playCard(S,me,ci,op){const P=S.P,p=P[me],c=C(ci),T_=S.turn;let a=c.t==='rent'?'rent':c.a;const royal=a==='royal';
 if(c.t!=='rent'&&c.t!=='action')return 'هذه البطاقة لا تُلعب كأمر';
 if(royal){a=op.as;const ok=Object.values(CARDS).some(x=>x.t==='action'&&!x.black&&x.a===a)||a==='rent';if(!ok)return 'اختر أمراً غير أسود';}
 if(RESP.includes(a))return 'هذه بطاقة رد، تُستخدم عندما يوجَّه إليك أمر';
 if(['double','triple'].includes(a))return 'ضم هذه البطاقة مع بطاقة إيجار أو ضريبة';
 const cards=[ci];let mult=1,mcard=null;
 if(op.mult){mcard=op.mult;if(!p.hand.includes(mcard)||!['double','triple'].includes(C(mcard).a))return 'بطاقة المضاعفة غير موجودة';if(!MULTABLE.includes(a))return 'المضاعفة مع الإيجار أو الضريبة فقط';if(movesLeft(S)<2)return 'المضاعفة تحتاج حركتين';mult=C(mcard).a==='double'?2:3;cards.push(mcard);}
 const tg=op.t;const opp=others(S,me);
 const need1=()=>{if(!tg||tg===me||!S.order.includes(tg))return 'اختر لاعباً';return null;};
 let pd=makePending(S,me,a,cards,{mult,royal});if(royal){pd.black=true;pd.label=`مرسوم ملكي (${opLabel(a)})`;}
 // validate & set up
 if(a==='rent'){const cs=royal?Object.keys(COLORS):c.cs;if(!cs.includes(op.color))return 'اختر لوناً من ألوان البطاقة';if(!setInfo(p)[op.color])return 'لا تملك أرضاً من هذا اللون';pd.color=op.color;pd.queue=opp.slice();pd.label+=` (${COLORS[op.color].n} ${rentOf(p,op.color)*mult}M)`;}
 else if(a==='rentwild'){let e=need1();if(e)return e;if(!setInfo(p)[op.color])return 'لا تملك أرضاً من هذا اللون';pd.color=op.color;pd.queue=[tg];pd.label+=` (${COLORS[op.color].n} ${rentOf(p,op.color)*mult}M)`;}
 else if(a==='rentgold'){const o=landOwner(S,op.land);if(!o)return 'اختر أرضاً في الساحة';const l=P[o].lands.find(x=>x.i===op.land);pd.color=l.c;pd.rentOwner=o;pd.queue=opp.slice();pd.label+=` (${cn(op.land)} ${rentOf(P[o],l.c)*mult}M)`;}
 else if(GROUP.includes(a)){pd.queue=opp.slice();if(['theeb','boom','nuke'].includes(a)){pd.sel=op.sel||{};}
   if(a==='auction'){const sel=op.sel||{};const ts=Object.keys(sel).filter(x=>opp.includes(x));if(!ts.length||ts.length>3)return 'اختر أرضاً من لاعب إلى ثلاثة لاعبين';for(const x of ts)if(!looseLands(P[x]).includes(sel[x]))return 'الأرض المختارة في مجموعة';pd.sel=sel;pd.queue=ts;}}
 else if(SINGLE.includes(a)){let e=need1();if(e)return e;pd.queue=[tg];
   if(needSel(a)){pd.sel={[tg]:op.sel};if(a==='swapset'||a==='atni')pd.mine=op.mine;if(!selValid(S,pd,tg))return 'اختيار غير صالح';}
   if(a==='swaphand'&&!P[tg].hand.length)return 'اللاعب لا يملك أوراقاً';
   if(a==='give'){const g=op.give;if(!g||g===ci||!p.hand.includes(g))return 'اختر بطاقة لتعطيها';p.hand.splice(p.hand.indexOf(ci),1);S.discard.push(ci);p.hand.splice(p.hand.indexOf(g),1);P[tg].hand.push(g);T_.used++;log(S,`🎁 ${nm(S,me)} أعطى بطاقة لـ ${nm(S,tg)}`);shown(S,me,[ci],'play',`${nm(S,me)} أعطى بطاقة لـ ${nm(S,tg)}`);return null;}
   if(a==='spit'||a==='tax'||a==='pay5'||a==='eslahat'||a==='rusoom'){} }
 else if(SELF.includes(a)){
   if(a==='burn')return 'استخدم زر الحرق مع بطاقة أخرى';
   if(a==='copy'){const lo=S.lastOrder;if(!lo||!S.discard.includes(lo)||C(lo).black)return 'لا يوجد أمر سابق يمكن أخذه';}
   for(const x of cards)p.hand.splice(p.hand.indexOf(x),1);S.discard.push(...cards);T_.used+=cards.length;
   const L=royal?pd.label:cn(ci);shown(S,me,cards,'play',`${nm(S,me)} لعب ${L}`);
   switch(a){case 'draw2':draw(S,me,2);log(S,`${nm(S,me)} لعب ${L} وسحب بطاقتين`);break;
    case 'again':{log(S,`🔁 ${nm(S,me)} لعب ${L}: يلعب دوره من جديد`);T_.unl=false;doDraw(S,me);T_.used=0;break;}
    case 'moves2':T_.moves+=2;log(S,`${nm(S,me)} لعب ${L}: +2 حركات`);break;
    case 'newhand':{const h=p.hand.splice(0);S.discard.push(...h);draw(S,me,5);log(S,`${nm(S,me)} غيّر ورقه بخمس جديدة`);break;}
    case 'barrier':p.st.barrier=S.tc+S.order.length;log(S,`🛡️ ${nm(S,me)} وضع حاجزاً لدورة كاملة`);break;
    case 'slow':S.fx.slow=S.tc+S.order.length;log(S,`🐢 Slow Game: الجميع يسحب بطاقة واحدة لدورة`);break;
    case 'fast':S.fx.fast=S.tc+S.order.length;log(S,`⚡ Fast Game: الجميع حركة واحدة لدورة`);break;
    case 'emp':S.fx.emp=S.tc+S.order.length;log(S,`⚡ E.M.P: بطاقة واحدة وحركة واحدة للجميع لدورة كاملة`);break;
    case 'reverse':S.dir*=-1;log(S,`🔄 ${nm(S,me)} عكس الدور`);break;
    case 'yaweel':draw(S,me,5);T_.unl=true;p.st.nap+=1;log(S,`😈 ياويلكم! ${nm(S,me)} سحب 5 وحركاته مفتوحة (وعليه غفوة الدورة القادمة)`,'bad');break;
    case 'kharab':S.reveal[me]={miss:true,until:S.tc};log(S,`👹 ${nm(S,me)} يقرأ مهمات اللاعبين`);break;
    case 'box':drawMission(S,me)?log(S,`📦 ${nm(S,me)} سحب مهمة إضافية`):log(S,'لا توجد مهام متبقية');break;
    case 'luck':{const un=p.miss.filter(m=>!m.done);if(!un.length){drawMission(S,me);}else{for(const m of un){S.mdeck.unshift(m.i);p.miss.splice(p.miss.indexOf(m),1);}for(let k=0;k<un.length;k++)drawMission(S,me);}log(S,`🎲 ${nm(S,me)} بدّل مهامه غير المحققة`);break;}
    case 'copy':{const lo=S.lastOrder;S.discard.splice(S.discard.indexOf(lo),1);p.hand.push(lo);log(S,`📋 ${nm(S,me)} أخذ ${cn(lo)} من الساحة إلى يده`);break;}
    case 'burn':return 'استخدم زر الحرق';}
   checkMissions(S,me);checkWin(S);return null;}
 else return 'أمر غير مدعوم';
 for(const x of cards)p.hand.splice(p.hand.indexOf(x),1);S.discard.push(...cards);T_.used+=cards.length;S.lastOrder=ci;
 log(S,`🃏 ${nm(S,me)} لعب ${pd.label}${pd.queue.length===1?' على '+nm(S,pd.queue[0]):''}`,'play');shown(S,me,cards,'play',`${nm(S,me)} لعب ${pd.label}${pd.queue.length===1?' على '+nm(S,pd.queue[0]):' على الجميع'}`);
 pd.played=cards;S.pending=pd;openTarget(S);return null;}
function opLabel(a){const c=Object.values(CARDS).find(x=>x.a===a);return a==='rent'?'إيجار':c?c.n:a;}
return {COLORS,CARDS,T,C,act,setInfo,looseLands,inSetLands,completeColors,fenced,score,setsCount,missionsDone,bankMoney,hasVisa,rentOf,payable,autoPick,newGame,stageActor,respOK,payAmount,needSel,selOptions,movesLeft,RESP,SINGLE,GROUP,SELF,MULTABLE,PAY_ACTIONS,DEFAULT_RULES,drawCountFor,opLabel,NO_BUILD,landOwner};

/*END*/

})();
if(typeof module!=='undefined')module.exports=ENGINE;
