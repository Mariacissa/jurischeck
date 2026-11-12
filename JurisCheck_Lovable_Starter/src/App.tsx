import { useEffect, useMemo, useState } from 'react';
import { Scale, ShieldCheck, FileSearch, History, CreditCard, Settings, UploadCloud, FileText, AlertTriangle, CheckCircle2, ArrowUpRight, Menu, X, Sparkles, LockKeyhole, Search, Download, LogOut, Loader2, MailCheck } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth';
import { supabase } from './lib/supabase';
import { useAuth } from './lib/useAuth';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

type Finding = {id:number;kind:string;reference:string;status:'Confirmada'|'Divergente'|'Não localizada'|'Atenção';risk:'Baixo'|'Médio'|'Alto';detail:string;action:string};
type Review = {id:string;name:string;date:string;status:string;findings:Finding[];text:string};
const demoFindings: Finding[] = [
 {id:1,kind:'Jurisprudência',reference:'REsp 9.999.999/MG (referência fictícia inserida para demonstração)',status:'Não localizada',risk:'Alto',detail:'Esta referência é um exemplo didático. Nenhuma consulta a uma base oficial foi realizada.',action:'Confira número, classe processual, tribunal e inteiro teor em fonte oficial.'},
 {id:2,kind:'Súmula',reference:'Súmula 385 do STJ',status:'Atenção',risk:'Médio',detail:'O exemplo não verifica o texto oficial nem a vigência da súmula.',action:'Compare a transcrição integral com a publicação oficial do STJ.'},
 {id:3,kind:'Legislação',reference:'Art. 489 do Código de Processo Civil',status:'Atenção',risk:'Baixo',detail:'Referência identificada no texto extraído; conteúdo e redação não foram validados.',action:'Confira a redação vigente no Portal da Legislação.'}
];
const plans=[{name:'Semanal',price:'R$ 7,00',period:'/ 7 dias',desc:'Para uso pontual'},{name:'Mensal',price:'R$ 20,00',period:'/ mês',desc:'Para rotina profissional',popular:true},{name:'Anual',price:'R$ 250,00',period:'/ ano',desc:'Para uso contínuo'}];

function initials(name:string|null, email:string){if(name&&name.trim())return name.trim().slice(0,2).toUpperCase();return email.slice(0,2).toUpperCase()}

function App(){
 const { session, profile, loading, signUp, signIn, signOut, resetPassword, updatePassword } = useAuth();
 const user = session?.user ?? null;
 const [page,setPage]=useState('Visão geral'); const [mobile,setMobile]=useState(false); const [file,setFile]=useState<File|null>(null); const [extract,setExtract]=useState(''); const [busy,setBusy]=useState(false); const [review,setReview]=useState<Review|null>(null); const [history,setHistory]=useState<Review[]>([]); const [query,setQuery]=useState('');
 const [notice,setNotice]=useState('');
 const [authMode,setAuthMode]=useState<'signin'|'signup'|'forgot'|'reset'>('signin');
 const [authOpen,setAuthOpen]=useState(false);
 const [authForm,setAuthForm]=useState({email:'',password:'',name:''});
 const [authBusy,setAuthBusy]=useState(false);
 const [authError,setAuthError]=useState('');
 const [authSuccess,setAuthSuccess]=useState('');
 const [resetEmail,setResetEmail]=useState('');

 const trialEnd=useMemo(()=>{const d=new Date();d.setDate(d.getDate()+7);return d.toLocaleDateString('pt-BR')},[]);

 const isLoggedIn = !!user;

 useEffect(()=>{
   if(typeof window!=='undefined'&&window.location.hash==='#reset'){
     setAuthMode('reset');setAuthOpen(true);setAuthError('');setAuthSuccess('');
   }
 },[]);

 async function loadHistory() {
   if (!supabase || !user) return;
   const { data } = await supabase
     .from('reviews')
     .select('id, file_name, status, report, created_at')
     .eq('user_id', user.id)
     .order('created_at', { ascending: false });
   if (data) {
     const mapped: Review[] = data.map((r: any) => ({
       id: r.id,
       name: r.file_name,
       date: new Date(r.created_at).toLocaleString('pt-BR'),
       status: r.status,
       findings: r.report?.findings ?? [],
       text: r.report?.text ?? '',
     }));
     setHistory(mapped);
   }
 }

 useEffect(() => { if (isLoggedIn) loadHistory(); }, [isLoggedIn]);

 async function readFile(f:File){
   setFile(f);setNotice('');
   try{
     if(f.type==='application/pdf'||f.name.toLowerCase().endsWith('.pdf')){
       const data=await f.arrayBuffer();const pdf=await pdfjsLib.getDocument({data}).promise;
       let all='';for(let i=1;i<=pdf.numPages;i++){const p=await pdf.getPage(i);const c=await p.getTextContent();all+=c.items.map((x:any)=>x.str||'').join(' ')+'\n';}
       setExtract(all);
     }else if(f.name.toLowerCase().endsWith('.docx')){
       const r=await mammoth.extractRawText({arrayBuffer:await f.arrayBuffer()});setExtract(r.value);
     }else{
       setExtract(await f.text());
     }
     setNotice('Documento carregado e texto extraído localmente.');
   }catch(err){
     console.error('Falha ao extrair texto do documento:',err);
     setExtract('');setNotice('Não foi possível extrair o texto. Tente um PDF pesquisável ou arquivo DOCX.');
   }
 }

 async function runDemo(){
   if(!file||!extract.trim()){setNotice('Envie um PDF ou DOCX com texto selecionável.');return;}
   if(!isLoggedIn){setAuthOpen(true);setAuthMode('signup');setNotice('Crie sua conta para gerar e salvar relatórios.');return;}
   setBusy(true);
   await new Promise(r=>setTimeout(r,900));
   const item:Review={id:crypto.randomUUID(),name:file.name,date:new Date().toLocaleString('pt-BR'),status:'Demonstração — não validada',findings:demoFindings,text:extract};

   if (supabase && user) {
     const { data, error } = await supabase
       .from('reviews')
       .insert({ file_name: file.name, status: item.status, report: { findings: item.findings, text: item.text } })
       .select('id, created_at')
       .maybeSingle();
     if (data && !error) {
       item.id = data.id;
       item.date = new Date(data.created_at).toLocaleString('pt-BR');
     }
   }

   setReview(item);
   setHistory(h=>[item,...h]);
   setBusy(false);
   setPage('Relatório');
 }

 async function handleAuth(e:React.FormEvent){
   e.preventDefault();
   setAuthError('');setAuthSuccess('');setAuthBusy(true);
   try{
     if(authMode==='signup'){
       if(authForm.name.trim().length<2){setAuthError('Informe seu nome completo.');setAuthBusy(false);return;}
       await signUp(authForm.email.trim(),authForm.password,authForm.name.trim());
       setNotice('Conta criada com sucesso. Você já está conectado.');
       setAuthOpen(false);
       setAuthForm({email:'',password:'',name:''});
     }else if(authMode==='forgot'){
       if(authForm.email.trim().length<5){setAuthError('Informe seu e-mail.');setAuthBusy(false);return;}
       await resetPassword(authForm.email.trim());
       setResetEmail(authForm.email.trim());
       setAuthSuccess('E-mail de recuperação enviado. Verifique sua caixa de entrada.');
       setAuthForm({email:'',password:'',name:''});
     }else if(authMode==='reset'){
       if(authForm.password.length<6){setAuthError('A senha deve ter pelo menos 6 caracteres.');setAuthBusy(false);return;}
       await updatePassword(authForm.password);
       setNotice('Senha redefinida com sucesso. Você já pode entrar normalmente.');
       setAuthOpen(false);
       setAuthMode('signin');
       setAuthForm({email:'',password:'',name:''});
       if(window.location.hash==='#reset') window.history.replaceState(null,'',window.location.pathname);
     }else{
       await signIn(authForm.email.trim(),authForm.password);
       setNotice('Login realizado com sucesso.');
       setAuthOpen(false);
       setAuthForm({email:'',password:'',name:''});
     }
   }catch(err:any){
     const msg = err?.message ?? 'Erro inesperado';
     if(msg.includes('Invalid login credentials')) setAuthError('E-mail ou senha incorretos.');
     else if(msg.includes('already registered')) setAuthError('Este e-mail já está cadastrado. Tente entrar.');
     else if(msg.includes('Password should be at least')) setAuthError('A senha deve ter pelo menos 6 caracteres.');
     else if(msg.includes('For security purposes')) setAuthError('Não é possível redefinir a senha agora. Tente novamente mais tarde.');
     else setAuthError(msg);
   }finally{setAuthBusy(false);}
 }

 async function handleSignOut(){
   await signOut();
   setHistory([]);
   setPage('Visão geral');
   setNotice('Você saiu da sua conta.');
 }

 function openAuth(mode:'signin'|'signup'|'forgot'|'reset'){setAuthMode(mode);setAuthOpen(true);setAuthError('');setAuthSuccess('');}

 const nav=[['Visão geral',FileSearch],['Nova revisão',UploadCloud],['Histórico',History],['Planos',CreditCard],['Configurações',Settings]] as const;
 const filtered=history.filter(h=>h.name.toLowerCase().includes(query.toLowerCase()));
 const displayName = profile?.full_name ?? (user?.email ?? '');
 const displaySub = isLoggedIn ? (user?.email ?? '') : 'Conta de teste';

 return <div className="app">
 <aside className={`sidebar ${mobile?'open':''}`}>
   <div className="brand"><div className="brandmark"><Scale size={23}/></div><div><b>JURISCHECK</b><small>INTELIGÊNCIA JURÍDICA</small></div><button className="mobile-close" onClick={()=>setMobile(false)}><X/></button></div>
   <div className="workspace"><span className="dot"/> {isLoggedIn?'CONTA ATIVA':'AMBIENTE DE TESTE'}</div>
   <nav>{nav.map(([label,Icon])=><button key={label} className={page===label?'active':''} onClick={()=>{setPage(label);setMobile(false)}}><Icon size={18}/>{label}</button>)}</nav>
   <div className="sidebar-bottom">
     <div className="trialbox"><div className="trialtitle"><Sparkles size={16}/> Teste gratuito</div><strong>7 dias</strong><p>Seu período demonstrativo termina em {trialEnd}.</p><button onClick={()=>setPage('Planos')}>Conhecer planos <ArrowUpRight size={14}/></button></div>
     {isLoggedIn ? (
       <div className="profile">
         <div className="avatar">{initials(profile?.full_name ?? null, user?.email ?? '')}</div>
         <div><b>{displayName}</b><small>{displaySub}</small></div>
         <button className="signout-btn" title="Sair" onClick={handleSignOut}><LogOut size={15}/></button>
       </div>
     ) : (
       <div className="profile">
         <div className="avatar">JC</div>
         <div><b>Advogado</b><small>Não conectado</small></div>
       </div>
     )}
   </div>
 </aside>
 <main className="main">
   <header>
     <button className="hamb" onClick={()=>setMobile(true)}><Menu/></button>
     <div className="crumb">JurisCheck <span>/</span> {page}</div>
     <div className="headright">
       <span className="secure"><LockKeyhole size={14}/> {isLoggedIn?'Sessão ativa':'Ambiente demonstrativo'}</span>
       {isLoggedIn ? (
         <button className="userbtn" onClick={handleSignOut}><LogOut size={14}/> Sair</button>
       ) : (
         <button className="userbtn" onClick={()=>openAuth('signin')}>Entrar</button>
       )}
     </div>
   </header>
   <div className="content">
   {page==='Visão geral'&&<>
     <div className="welcome"><div><div className="eyebrow">PLATAFORMA DE CONFERÊNCIA JURÍDICA</div><h1>Mais segurança antes de protocolar.</h1><p>Revise referências jurídicas, encontre pontos que merecem conferência e organize suas análises em um só lugar.</p><button className="primary" onClick={()=>setPage('Nova revisão')}><UploadCloud size={17}/> Iniciar nova revisão</button></div><div className="heroicon"><Scale size={76}/><div className="orbit o1"/><div className="orbit o2"/></div></div>
     <div className="notice"><AlertTriangle size={18}/><div><b>Versão inicial demonstrativa</b><span>Os relatórios desta versão são simulados. Ainda não há consulta real a tribunais ou validação jurídica automatizada.</span></div></div>
     <div className="sectionhead"><div><h2>Seu espaço de trabalho</h2><p>Acompanhe suas revisões e acesse as ferramentas.</p></div></div>
     <div className="stats">
       <div className="stat"><span className="staticon"><FileText/></span><small>Documentos revisados</small><b>{isLoggedIn?history.length:'—'}</b><em>{isLoggedIn?'no seu histórico':'entre para salvar'}</em></div>
       <div className="stat"><span className="staticon amber"><AlertTriangle/></span><small>Pontos para conferir</small><b>{history.reduce((a,x)=>a+x.findings.length,0)}</b><em>resultados simulados</em></div>
       <div className="stat"><span className="staticon green"><ShieldCheck/></span><small>Fontes verificadas</small><b>—</b><em>integração pendente</em></div>
     </div>
     {!isLoggedIn && <div className="auth-prompt"><div><b>Crie sua conta para salvar revisões</b><span>Com uma conta você mantém seu histórico salvo e organizado.</span></div><button className="primary" onClick={()=>openAuth('signup')}>Criar conta gratuita</button></div>}
     <div className="quick">
       <button onClick={()=>setPage('Nova revisão')}><UploadCloud/><b>Enviar peça jurídica</b><span>PDF ou Word (.docx)</span></button>
       <button onClick={()=>setPage('Histórico')}><History/><b>Consultar histórico</b><span>{isLoggedIn?'Suas revisões salvas':'Entre para acessar'}</span></button>
       <button onClick={()=>setPage('Planos')}><CreditCard/><b>Ver assinaturas</b><span>Conheça os planos</span></button>
     </div>
   </>}

   {page==='Nova revisão'&&<>
     <div className="pageintro"><div className="eyebrow">ANÁLISE DE DOCUMENTOS</div><h1>Nova revisão jurídica</h1><p>Envie sua peça para extrair as referências e preparar uma conferência demonstrativa.</p></div>
     <div className="panel uploadpanel">
       <div className="paneltitle"><div><h2>Documento para revisão</h2><p>Formatos aceitos: PDF pesquisável e Word (.docx). Tamanho recomendado: até 10 MB.</p></div><span className="step">ETAPA 01</span></div>
       <label className="dropzone"><input type="file" accept=".pdf,.docx,.txt" onChange={e=>e.target.files?.[0]&&readFile(e.target.files[0])}/><div className="uploadcircle"><UploadCloud size={26}/></div><b>{file?file.name:'Arraste seu documento ou clique para selecionar'}</b><span>{file?`${(file.size/1024/1024).toFixed(2)} MB`:'PDF, DOCX ou TXT'}</span><small>O texto é extraído no seu navegador nesta versão.</small></label>
       {extract&&<div className="extract"><div><CheckCircle2 size={16}/> Texto extraído · {extract.length.toLocaleString('pt-BR')} caracteres</div><textarea value={extract.slice(0,5000)} readOnly/></div>}
       <div className="privacy"><ShieldCheck size={17}/><span>Não envie documentos sigilosos ou dados pessoais reais nesta versão de demonstração.</span></div>
       {!isLoggedIn && <div className="notice"><AlertTriangle size={16}/><div><b>Crie uma conta para salvar</b><span>Você pode extrair o texto sem conta, mas precisa entrar para gerar e salvar o relatório.</span></div></div>}
       <button className="primary wide" disabled={!file||busy||!extract.trim()} onClick={runDemo}>{busy?'Preparando relatório...':<><Sparkles size={17}/> {isLoggedIn?'Gerar relatório demonstrativo':'Entrar para gerar relatório'}</>}</button>
     </div>
   </>}

   {page==='Relatório'&&review&&<>
     <div className="pageintro"><div className="eyebrow">RESULTADO DA REVISÃO</div><h1>Relatório de conferência</h1><p>{review.name} · {review.date}</p></div>
     <div className="notice danger"><AlertTriangle/><div><b>Relatório demonstrativo — não utilizar como parecer jurídico</b><span>Os status abaixo são exemplos de interface. Nenhuma fonte oficial foi consultada e nenhuma conclusão sobre autenticidade foi produzida.</span></div></div>
     <div className="reporttop"><div><small>REFERÊNCIAS NO EXEMPLO</small><b>{review.findings.length}</b></div><div><small>CLASSIFICAÇÃO</small><b>Simulação</b></div><button className="secondary" onClick={()=>window.print()}><Download size={16}/> Imprimir relatório</button></div>
     {review.findings.map(f=><div className="finding" key={f.id}><div className="findinghead"><span className={`status ${f.status==='Não localizada'?'red':f.status==='Divergente'?'amber':'blue'}`}>{f.status}</span><span className={`risk ${f.risk.toLowerCase()}`}>Risco {f.risk}</span><small>{f.kind}</small></div><h3>{f.reference}</h3><p>{f.detail}</p><div className="action"><b>Próxima ação sugerida</b><span>{f.action}</span></div></div>)}
   </>}

   {page==='Histórico'&&<>
     <div className="pageintro"><div className="eyebrow">DOCUMENTOS</div><h1>Histórico de revisões</h1><p>{isLoggedIn?'Consulte os relatórios salvos na sua conta.':'Entre na sua conta para acessar o histórico salvo.'}</p></div>
     {isLoggedIn ? <>
       <div className="searchbar"><Search size={18}/><input placeholder="Buscar pelo nome do documento..." value={query} onChange={e=>setQuery(e.target.value)}/></div>
       {filtered.length?filtered.map(h=><button className="historyrow" key={h.id} onClick={()=>{setReview(h);setPage('Relatório')}}><FileText/><span><b>{h.name}</b><small>{h.date}</small></span><em>{h.status}</em><ArrowUpRight/></button>)
       :<div className="empty"><History size={34}/><b>Nenhuma revisão encontrada</b><span>Envie um documento para começar seu histórico.</span><button className="primary" onClick={()=>setPage('Nova revisão')}>Nova revisão</button></div>}
     </> : <>
       <div className="empty"><History size={34}/><b>Histórico disponível após login</b><span>Crie sua conta ou entre para salvar e consultar suas revisões.</span><button className="primary" onClick={()=>openAuth('signin')}>Entrar</button></div>
     </>}
   </>}

   {page==='Planos'&&<>
     <div className="pageintro center"><div className="eyebrow">PLANOS E ACESSO</div><h1>Escolha seu plano</h1><p>Experimente por 7 dias e conheça os recursos do JurisCheck.</p></div>
     <div className="trialbanner"><Sparkles/><div><b>7 dias gratuitos para começar</b><span>Sem cartão de crédito nesta etapa demonstrativa.</span></div></div>
     <div className="plans">{plans.map(p=><div className={`plan ${p.popular?'featured':''}`} key={p.name}>{p.popular&&<span className="popular">MAIS ESCOLHIDO</span>}<h3>{p.name}</h3><p>{p.desc}</p><div className="price">{p.price}<small>{p.period}</small></div><ul><li><CheckCircle2/> Revisão de documentos</li><li><CheckCircle2/> Relatórios organizados</li><li><CheckCircle2/> Histórico de análises</li></ul><button className={p.popular?'primary':'secondary'} onClick={()=>setNotice('A cobrança online ainda não está integrada. Nenhuma assinatura foi criada.')}>Assinar {p.name}</button></div>)}</div>
     <p className="fineprint">Preços apresentados como proposta comercial. Checkout, renovação e controle de acesso ainda precisam ser integrados e testados.</p>
   </>}

   {page==='Configurações'&&<>
     <div className="pageintro"><div className="eyebrow">PREFERÊNCIAS</div><h1>Configurações</h1><p>Configuração inicial do ambiente.</p></div>
     <div className="panel setting"><div className="settingicon"><LockKeyhole/></div><div><b>Conta</b><p>{isLoggedIn?`Conectado como ${user?.email}`:'Nenhuma conta conectada.'}</p></div><span className={`pill ${isLoggedIn?'ok':''}`}>{isLoggedIn?'Ativo':'Pendente'}</span></div>
     <div className="panel setting"><div className="settingicon"><ShieldCheck/></div><div><b>Conexão com Supabase</b><p>{supabase?'Conectado. Autenticação e banco de dados ativos.':'Ainda não configurada.'}</p></div><span className={`pill ${supabase?'ok':''}`}>{supabase?'Conectado':'Pendente'}</span></div>
     <div className="panel setting"><div className="settingicon"><FileSearch/></div><div><b>Plano atual</b><p>{isLoggedIn?`Plano: ${profile?.plan ?? 'trial'} · Status: ${profile?.subscription_status ?? 'trialing'}`:'Entre para ver seu plano.'}</p></div></div>
     <div className="panel setting"><div className="settingicon"><ShieldCheck/></div><div><b>Privacidade e segurança</b><p>Antes de operar com peças reais, configure políticas de acesso, retenção e exclusão de dados, além de revisar a adequação à LGPD.</p></div></div>
   </>}
   </div>
   <footer>© 2026 JurisCheck · Tecnologia de apoio à conferência jurídica <span>Não substitui a análise profissional do advogado.</span></footer>
 </main>

 {notice&&<div className="toast" onClick={()=>setNotice('')}>{notice}<button><X size={15}/></button></div>}

 {authOpen&&<div className="modalback" onClick={()=>setAuthOpen(false)}>
   <div className="modal auth-modal" onClick={e=>e.stopPropagation()}>
     <button className="modalclose" onClick={()=>setAuthOpen(false)}><X/></button>
     <div className="brandmark"><Scale/></div>
     {authMode==='signin'&&<h2>Entrar na sua conta</h2>}
     {authMode==='signup'&&<h2>Criar sua conta</h2>}
     {authMode==='forgot'&&<h2>Recuperar senha</h2>}
     {authMode==='reset'&&<h2>Redefinir senha</h2>}
     {authMode==='signin'&&<p>Acesse seu histórico de revisões.</p>}
     {authMode==='signup'&&<p>Comece a salvar suas revisões gratuitamente.</p>}
     {authMode==='forgot'&&<p>Informe seu e-mail para receber o link de recuperação.</p>}
     {authMode==='reset'&&<p>Defina sua nova senha para acessar sua conta.</p>}
     {authError&&<div className="auth-error"><AlertTriangle size={15}/> {authError}</div>}
     {authSuccess&&<div className="auth-success"><MailCheck size={15}/> {authSuccess}</div>}
     <form className="auth-form" onSubmit={handleAuth}>
       {authMode==='signup'&&<input type="text" placeholder="Nome completo" value={authForm.name} onChange={e=>setAuthForm(f=>({...f,name:e.target.value}))} required autoComplete="name"/>}
       {(authMode==='signin'||authMode==='signup'||authMode==='forgot')&&<input type="email" placeholder="E-mail" value={authForm.email} onChange={e=>setAuthForm(f=>({...f,email:e.target.value}))} required autoComplete="email"/>}
       {(authMode==='signin'||authMode==='signup'||authMode==='reset')&&<input type="password" placeholder={authMode==='reset'?'Nova senha (mín. 6 caracteres)':'Senha (mín. 6 caracteres)'} value={authForm.password} onChange={e=>setAuthForm(f=>({...f,password:e.target.value}))} required autoComplete={authMode==='signin'?'current-password':'new-password'} minLength={6}/>}
       <button className="primary wide" type="submit" disabled={authBusy}>{authBusy?<><Loader2 size={16} className="spin"/> Aguarde...</>:<>{authMode==='signin'?'Entrar':authMode==='signup'?'Criar conta':authMode==='forgot'?'Enviar link de recuperação':'Salvar nova senha'}</>}</button>
     </form>
     <div className="auth-switch">
       {authMode==='signin'&&<><button className="link-btn" onClick={()=>{setAuthMode('forgot');setAuthError('');setAuthSuccess('')}}>Esqueci minha senha</button><span className="switch-divider"/></>}
       {authMode==='signin'&&'Ainda não tem conta? '}
       {authMode==='signup'&&'Já tem uma conta? '}
       {authMode==='forgot'&&'Lembrou sua senha? '}
       {authMode==='reset'&&'Cancelar e voltar para login '}
       {authMode==='signin'&&<button onClick={()=>{setAuthMode('signup');setAuthError('');setAuthSuccess('')}}>Criar conta</button>}
       {authMode==='signup'&&<button onClick={()=>{setAuthMode('signin');setAuthError('');setAuthSuccess('')}}>Entrar</button>}
       {authMode==='forgot'&&<button onClick={()=>{setAuthMode('signin');setAuthError('');setAuthSuccess('')}}>Entrar</button>}
       {authMode==='reset'&&<button onClick={()=>{setAuthMode('signin');setAuthError('');setAuthSuccess('');setAuthOpen(false);if(window.location.hash==='#reset')window.history.replaceState(null,'',window.location.pathname)}}>Voltar</button>}
     </div>
     {authMode==='forgot'&&resetEmail&&<p className="reset-hint">Se não receber em alguns minutos, verifique o spam ou tente novamente.</p>}
   </div>
 </div>}
 </div>;
}
export default App;
