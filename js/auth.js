
const FALLBACK = {
  config: {"appName": "CAT Learning", "tagline": "Computer Assisted Test", "githubRepoUrl": "https://github.com/YOUR-USERNAME/YOUR-REPO", "githubPagesUrl": "https://YOUR-USERNAME.github.io/YOUR-REPO/", "dataFiles": ["data/users.json", "data/roles.json", "data/config.json", "questions/index.json", "materials/index.json"], "features": {"cat": true, "teach": true, "materials": true, "generator": true}, "defaults": {"questionsPerTest": 10, "timerMode": "normal"}},
  roles: {"super": {"label": "Super", "permissions": ["dashboard", "take_test", "teach", "materials", "generate", "manage_data"]}, "teacher": {"label": "Teacher", "permissions": ["dashboard", "take_test", "teach", "materials", "generate"]}, "student": {"label": "Student", "permissions": ["dashboard", "take_test", "materials"]}},
  users: [{"username": "super", "name": "Super Admin", "role": "super", "active": true, "passwordHash": "6eb7d4e93479f9534588ef1084e7862a45e98ac3b378f9c6862757941b220b88"}, {"username": "teacher", "name": "Teacher Demo", "role": "teacher", "active": true, "passwordHash": "202dd3a65ba14582551e6660d122172f09b0afaab70f5ad3b3b73d5a23f5ab1d"}, {"username": "student", "name": "Student Demo", "role": "student", "active": true, "passwordHash": "cb2433073edb25ca77f0445dcdbd7e7c568196eef1cd54da7228ddd227240e2e"}],
  qIndex: {"files": [{"id": "sample-english", "file": "questions/sample-english.json", "title": "Sample English - Simple Present & Correction", "description": "2 sample questions: multiple choice + correction", "count": 2}]},
  mIndex: {"materials": [{"id": "notes-md", "title": "Study Notes - Simple Present", "type": "md", "file": "materials/sample-notes.md", "description": "Short notes on Simple Present Tense"}, {"id": "notes-txt", "title": "Quick Reference - TXT", "type": "txt", "file": "materials/sample-notes.txt", "description": "Plain text reference"}, {"id": "sample-pdf", "title": "Sample PDF Material", "type": "pdf", "file": "materials/sample-notes.pdf", "description": "Replace with your PDF in /materials/"}, {"id": "sample-img", "title": "Sample Image Material", "type": "jpg", "file": "materials/sample.jpg", "description": "Replace with your image in /materials/"}]},
  sampleQuestions: {"meta": {"title": "Test title", "description": "Question Description", "info": "Additional information about the test.", "author": "Author Name", "config": {"show_answer": false, "show_explanation": false, "no_timer": true, "active": true}}, "questions": [{"id": 1, "type": "multiple_choice", "data": {"hint": "Choose the correct verb form to complete the sentence.", "image": {"url": "https://via.placeholder.com/400x200/sample-image.jpg", "orientation": "landscape"}, "passage": "She is a fitness enthusiast and maintains a strict routine. <br>Every morning, she wakes up early and heads to the gym for her workout session. She <b>believes</b> that regular exercise is essential for a healthy lifestyle.", "question": "She ___ to the gym every morning."}, "options": {"A": {"text": "gone"}, "B": {"text": "going", "correct": false}, "C": {"text": "goes", "correct": true}, "D": {"text": "go"}, "E": {"text": "always goes", "correct": true}}, "explanation": {"text": "Third person singular subject 'She' requires the verb form 'goes' in the simple present tense. Also, 'always goes' is correct as it indicates a habitual action.", "topic": "Simple Present Tense", "concept": "Subject-Verb Agreement", "formula": "Subject (He/She/It) + Verb (base form + s/es)", "examples": ["He <b>goes</b> to school every day.", "She <b>likes</b> to read books."]}, "config": {"show_answer": true, "show_explanation": true, "level": 1, "time_in_seconds": {"fast": 15, "normal": 30, "easy": 60}}}, {"id": 2, "type": "correction", "data": {"hint": "Click the incorrect parts and type the correct form (may contain 0, 1 or multiple errors). If no error, choose No Error."}, "multiErrorSegments": [{"id": "s1", "text": "Having", "clickable": false}, {"id": "s2", "text": "warning", "clickable": true, "isError": true, "correctAnswers": ["been warned"]}, {"id": "s3", "text": "about the risks,", "clickable": false}, {"id": "s4", "text": "the team,", "clickable": true, "isError": false}, {"id": "s5", "text": "which were responsible", "clickable": true, "isError": true, "correctAnswers": ["which was responsible", "that was responsible"]}, {"id": "s6", "text": "for the safety checks,", "clickable": false}, {"id": "s7", "text": "proceeded cautiously,", "clickable": true, "isError": false}, {"id": "s8", "text": "neither of the supervisors being aware", "clickable": true, "isError": false}, {"id": "s9", "text": "of the final decision.", "clickable": false}], "explanation": {"text": "The correct forms are 'been warned' instead of 'warning' and 'which was responsible' or 'that was responsible' instead of 'which were responsible'.", "topic": "Subject-Verb Agreement", "concept": "Correcting verb forms to match subject number and tense.", "formula": "Subject (singular/plural) + Verb (correct form)", "examples": ["The team, which <b>was responsible</b> for the project, completed it on time.", "Having <b>been warned</b> about the risks, they proceeded cautiously."]}, "config": {"show_answer": true, "show_explanation": true, "level": 4, "time_in_seconds": {"fast": 15, "normal": 30, "easy": 60}}}]},
  sampleMd: "# Simple Present Tense\n\n**Formula:** Subject (He / She / It) + Verb + s/es\n\n## Examples\n- She **goes** to the gym every morning.\n- He **likes** to read books.\n\n## When to use\n- Habits / routines\n- Facts\n- Schedules\n",
  sampleTxt: "SIMPLE PRESENT - QUICK REFERENCE\n\nFormula: Subject (He/She/It) + Verb + s/es\n\nExamples:\n- She goes to the gym every morning.\n- He likes to read books.\n\nUse for habits, facts, and schedules.\n"
};

const Auth = {
  user:null, config:null, roles:null, usersRaw:[], qIndex:null, mIndex:null, usedFallback:false,
  async loadAll(){
    // Try each file individually. If fetch fails (file://, wrong path, offline), use embedded fallback so login still works.
    const cfg = await fetchJSONOrNull('data/config.json');
    const rl = await fetchJSONOrNull('data/roles.json');
    const us = await fetchJSONOrNull('data/users.json');
    const qi = await fetchJSONOrNull('questions/index.json');
    const mi = await fetchJSONOrNull('materials/index.json');
    let fellBack = false;
    this.config = cfg || (fellBack=true, FALLBACK.config);
    this.roles = (rl && (rl.roles||rl)) || (fellBack=true, FALLBACK.roles);
    this.usersRaw = (us && (us.users||[])) || (fellBack=true, FALLBACK.users);
    this.qIndex = qi || (fellBack=true, FALLBACK.qIndex);
    this.mIndex = mi || (fellBack=true, FALLBACK.mIndex);
    this.usedFallback = fellBack;
    if(!this.usersRaw.length) this.usersRaw = FALLBACK.users;
    if(!this.config) this.config = FALLBACK.config;
    if(!this.roles) this.roles = FALLBACK.roles;
    return true;
  },
  async login(username, password){
    if(!username || !password) throw new Error('Enter username and password.');
    if(!this.usersRaw || !this.usersRaw.length){
      await this.loadAll();
    }
    const u = this.usersRaw.find(x=>String(x.username).toLowerCase()===String(username).trim().toLowerCase());
    if(!u || !u.active) throw new Error('Invalid username or password.');
    let hash = '';
    try{ hash = await sha256Hex(password); }catch(e){ throw new Error('Login failed to hash password. Try a secure context (https / localhost).'); }
    if(hash !== u.passwordHash) throw new Error('Invalid username or password.');
    this.user = {username:u.username, name:u.name, role:u.role};
    safeSessionSet('cat_session', JSON.stringify(this.user));
    return this.user;
  },
  restore(){
    try{
      const s = safeSessionGet('cat_session');
      if(s){ this.user = JSON.parse(s); return this.user; }
    }catch(e){}
    return null;
  },
  logout(){ this.user=null; safeSessionRemove('cat_session'); },
  can(perm){
    if(!this.user) return false;
    const r = this.roles && this.roles[this.user.role];
    return r && r.permissions.includes(perm);
  },
  isSuper(){ return this.user && this.user.role==='super'; }
};
async function loadQuestionsFile(filePath){
  // file:// fallback for the bundled sample
  const data = await fetchJSONOrNull(filePath);
  if(data) return data;
  if(filePath.includes('sample-english')) return FALLBACK.sampleQuestions;
  throw new Error('Could not load '+filePath+'. Serve via HTTP (GitHub Pages / Live Server) or check the file exists.');
}
async function loadMaterialText(filePath){
  try{ return await fetchText(filePath); }catch(e){
    if(filePath.includes('sample-notes.md')) return FALLBACK.sampleMd;
    if(filePath.includes('sample-notes.txt')) return FALLBACK.sampleTxt;
    throw e;
  }
}
