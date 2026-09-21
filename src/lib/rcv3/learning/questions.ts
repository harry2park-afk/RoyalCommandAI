import 'server-only';
import {EXAM_QUESTIONS,type Question} from './course';
const items: (Question & {answer:number})[] = [
 {
  "id": "q001",
  "lesson": "001",
  "text": "For “Why study AI history?”, which statement or practice is correct?",
  "ko": "“AI 역사를 배우는 이유”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Treat early AI as smaller versions of today's language models",
   "Rank historical methods only by release date",
   "Compare changes in methods and limitations"
  ],
  "koOptions": [
   "초기 AI를 오늘날 언어 모델의 축소판으로 본다",
   "발표 연도만으로 과거 방법의 우열을 정한다",
   "방법과 한계의 변화를 비교한다"
  ],
  "answer": 2
 },
 {
  "id": "q002",
  "lesson": "002",
  "text": "For “Turing and machine intelligence”, which statement or practice is correct?",
  "ko": "“튜링과 기계 지능”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Treat passing a conversation test as proof of consciousness",
   "Define intelligence only by calculation speed",
   "Distinguish imitation from consciousness"
  ],
  "koOptions": [
   "대화 시험 통과를 의식의 증명으로 본다",
   "계산 속도만으로 지능을 정의한다",
   "모방과 의식을 구분한다"
  ],
  "answer": 2
 },
 {
  "id": "q003",
  "lesson": "003",
  "text": "For “Dartmouth in 1956”, which statement or practice is correct?",
  "ko": "“1956년 다트머스”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Identify it as the invention of the Transformer",
   "Identify it as the launch of the first public chatbot",
   "Recognise it as a founding research milestone"
  ],
  "koOptions": [
   "트랜스포머의 발명으로 이해한다",
   "최초 공개 챗봇의 출시로 이해한다",
   "분야 형성의 연구 이정표로 이해한다"
  ],
  "answer": 2
 },
 {
  "id": "q004",
  "lesson": "004",
  "text": "For “Symbolic AI”, which statement or practice is correct?",
  "ko": "“기호주의 AI”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Identify the explicit rules",
   "Look only for statistical patterns learned from examples",
   "Assume every rule is learned automatically from data"
  ],
  "koOptions": [
   "명시된 규칙을 확인한다",
   "예시에서 학습한 통계 패턴만 찾는다",
   "모든 규칙이 데이터에서 자동 학습된다고 본다"
  ],
  "answer": 0
 },
 {
  "id": "q005",
  "lesson": "005",
  "text": "For “Expert systems”, which statement or practice is correct?",
  "ko": "“전문가 시스템”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Check the system's domain boundaries",
   "Use the number of rules as the sole measure of reliability",
   "Extend medical rules to finance without domain review"
  ],
  "koOptions": [
   "시스템의 적용 분야를 확인한다",
   "규칙 수만으로 신뢰성을 평가한다",
   "분야 검토 없이 의료 규칙을 금융에 적용한다"
  ],
  "answer": 0
 },
 {
  "id": "q006",
  "lesson": "006",
  "text": "For “AI winters”, which statement or practice is correct?",
  "ko": "“AI 겨울”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Compare promises with demonstrated results",
   "Explain funding declines only through slower hardware",
   "Treat reduced investment as proof that all AI methods failed"
  ],
  "koOptions": [
   "약속과 입증된 성과를 비교한다",
   "지원 감소를 느린 하드웨어만으로 설명한다",
   "투자 감소를 모든 AI 방법의 실패 증거로 본다"
  ],
  "answer": 0
 },
 {
  "id": "q007",
  "lesson": "007",
  "text": "For “Statistical machine learning”, which statement or practice is correct?",
  "ko": "“통계적 기계학습”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Assume a larger sample automatically removes sampling bias",
   "Inspect output formatting instead of training-data coverage",
   "Examine the training examples"
  ],
  "koOptions": [
   "자료가 많으면 표본 편향이 자동 제거된다고 본다",
   "학습자료의 범위 대신 출력 형식을 검사한다",
   "학습 예시를 살핀다"
  ],
  "answer": 2
 },
 {
  "id": "q008",
  "lesson": "008",
  "text": "For “The rise of deep learning”, which statement or practice is correct?",
  "ko": "“딥러닝의 발전”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Attribute progress entirely to increasing layer count",
   "Compare algorithms without considering available computation",
   "Consider data, computation and methods together"
  ],
  "koOptions": [
   "발전을 층 수 증가만으로 설명한다",
   "사용 가능한 계산량을 고려하지 않고 알고리즘을 비교한다",
   "데이터·계산·방법을 함께 본다"
  ],
  "answer": 2
 },
 {
  "id": "q009",
  "lesson": "009",
  "text": "For “The Transformer in 2017”, which statement or practice is correct?",
  "ko": "“2017년 트랜스포머”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Treat the architecture's publication as a guarantee of factual accuracy",
   "Distinguish architecture from answer reliability",
   "Assume attention provides direct access to current information"
  ],
  "koOptions": [
   "구조의 발표를 사실 정확성의 보증으로 본다",
   "구조와 답변의 신뢰성을 구분한다",
   "어텐션이 최신 정보에 직접 접근한다고 본다"
  ],
  "answer": 1
 },
 {
  "id": "q010",
  "lesson": "010",
  "text": "For “From models to assistants”, which statement or practice is correct?",
  "ko": "“모델에서 비서로”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Assume every assistant can access every installed app",
   "Separate model capability from tool integration",
   "Assume generating an email also sends it"
  ],
  "koOptions": [
   "모든 비서가 설치된 모든 앱에 접근한다고 본다",
   "모델 능력과 도구 연결을 구분한다",
   "이메일을 생성하면 발송도 된다고 본다"
  ],
  "answer": 1
 },
 {
  "id": "q011",
  "lesson": "011",
  "text": "For “AI, ML and deep learning”, which statement or practice is correct?",
  "ko": "“AI·기계학습·딥러닝”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Treat deep learning as a category that contains all AI",
   "Understand the nested relationship",
   "Use AI and supervised learning as equivalent terms"
  ],
  "koOptions": [
   "딥러닝을 모든 AI를 포함하는 범주로 본다",
   "포함 관계를 이해한다",
   "AI와 지도학습을 같은 용어로 쓴다"
  ],
  "answer": 1
 },
 {
  "id": "q012",
  "lesson": "012",
  "text": "For “Data and labels”, which statement or practice is correct?",
  "ko": "“데이터와 정답표”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Check the number of labels without checking their meaning",
   "Accept labels solely because they were machine-generated",
   "Check label quality"
  ],
  "koOptions": [
   "의미를 확인하지 않고 라벨 개수만 확인한다",
   "기계가 생성했다는 이유만으로 라벨을 받아들인다",
   "라벨의 품질을 확인한다"
  ],
  "answer": 2
 },
 {
  "id": "q013",
  "lesson": "013",
  "text": "For “Supervised learning”, which statement or practice is correct?",
  "ko": "“지도학습”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Report training accuracy as the final measure of generalisation",
   "Evaluate on unseen examples",
   "Use the same labelled examples for training and final testing"
  ],
  "koOptions": [
   "학습 정확도를 일반화의 최종 지표로 보고한다",
   "보지 않은 예시로 평가한다",
   "동일한 라벨 예시를 학습과 최종 시험에 쓴다"
  ],
  "answer": 1
 },
 {
  "id": "q014",
  "lesson": "014",
  "text": "For “Unsupervised learning”, which statement or practice is correct?",
  "ko": "“비지도학습”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Treat each discovered cluster as a verified real-world category",
   "Interpret discovered patterns carefully",
   "Assume clustering identifies the cause of a pattern"
  ],
  "koOptions": [
   "발견된 각 군집을 검증된 현실 범주로 본다",
   "발견한 패턴을 신중히 해석한다",
   "군집화가 패턴의 원인을 찾아낸다고 본다"
  ],
  "answer": 1
 },
 {
  "id": "q015",
  "lesson": "015",
  "text": "For “Reinforcement learning”, which statement or practice is correct?",
  "ko": "“강화학습”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Assume a high reward proves alignment with every human goal",
   "Optimise the recorded reward without checking side effects",
   "Check whether the reward matches the real goal"
  ],
  "koOptions": [
   "높은 보상이 모든 인간 목표와의 일치를 증명한다고 본다",
   "부작용 확인 없이 기록된 보상만 최적화한다",
   "보상이 실제 목표와 맞는지 확인한다"
  ],
  "answer": 2
 },
 {
  "id": "q016",
  "lesson": "016",
  "text": "For “Neural networks”, which statement or practice is correct?",
  "ko": "“신경망”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Treat the brain analogy as limited",
   "Infer human consciousness from the term neural",
   "Treat an artificial neuron as a complete biological neuron"
  ],
  "koOptions": [
   "뇌와의 비유에는 한계가 있음을 이해한다",
   "신경이라는 명칭에서 인간과 같은 의식을 추론한다",
   "인공 뉴런을 완전한 생물학적 뉴런으로 본다"
  ],
  "answer": 0
 },
 {
  "id": "q017",
  "lesson": "017",
  "text": "For “Training versus inference”, which statement or practice is correct?",
  "ko": "“학습과 추론”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Treat generating a response as the same process as pretraining",
   "Distinguish using a model from training it",
   "Assume every prompt permanently retrains model weights"
  ],
  "koOptions": [
   "답변 생성을 사전학습과 동일한 과정으로 본다",
   "모델 사용과 학습을 구분한다",
   "모든 질문이 모델 가중치를 영구 재학습시킨다고 본다"
  ],
  "answer": 1
 },
 {
  "id": "q018",
  "lesson": "018",
  "text": "For “Overfitting”, which statement or practice is correct?",
  "ko": "“과적합”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Check only examples already used to tune the model",
   "Check generalisation on held-out data",
   "Increase training accuracy and stop measuring unseen cases"
  ],
  "koOptions": [
   "모델 조정에 이미 쓴 예시만 확인한다",
   "별도 자료에서 일반화 성능을 확인한다",
   "학습 정확도를 높이고 새 사례 측정을 중단한다"
  ],
  "answer": 1
 },
 {
  "id": "q019",
  "lesson": "019",
  "text": "For “Validation and test sets”, which statement or practice is correct?",
  "ko": "“검증 자료와 시험 자료”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Move difficult test cases into training before reporting the score",
   "Keep assessment data separate",
   "Repeatedly tune on the final test set"
  ],
  "koOptions": [
   "점수 보고 전 어려운 시험 사례를 학습자료로 옮긴다",
   "평가 자료를 분리한다",
   "최종 시험 자료로 반복 조정한다"
  ],
  "answer": 1
 },
 {
  "id": "q020",
  "lesson": "020",
  "text": "For “Correlation and causation”, which statement or practice is correct?",
  "ko": "“상관관계와 인과관계”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Treat a model's prediction as a controlled experiment",
   "Avoid assuming correlation proves causation",
   "Infer causation from a strong correlation alone"
  ],
  "koOptions": [
   "모델 예측을 통제 실험으로 본다",
   "상관관계를 원인의 증거로 단정하지 않는다",
   "강한 상관관계만으로 인과관계를 추론한다"
  ],
  "answer": 1
 },
 {
  "id": "q021",
  "lesson": "021",
  "text": "For “Tokens”, which statement or practice is correct?",
  "ko": "“토큰”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Distinguish tokens from words",
   "Estimate tokens by counting words exactly one for one",
   "Assume every language uses the same tokens per character"
  ],
  "koOptions": [
   "토큰과 단어를 구분한다",
   "단어 하나를 토큰 하나로 정확히 계산한다",
   "모든 언어가 글자당 동일한 토큰을 쓴다고 본다"
  ],
  "answer": 0
 },
 {
  "id": "q022",
  "lesson": "022",
  "text": "For “Embeddings”, which statement or practice is correct?",
  "ko": "“임베딩”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Assume semantically similar statements cannot contradict each other",
   "Review the meaning beyond similarity scores",
   "Treat the highest similarity score as factual verification"
  ],
  "koOptions": [
   "의미가 비슷한 문장은 서로 모순될 수 없다고 본다",
   "유사도 점수 외에 의미를 확인한다",
   "최고 유사도 점수를 사실 검증으로 본다"
  ],
  "answer": 1
 },
 {
  "id": "q023",
  "lesson": "023",
  "text": "For “Attention and context”, which statement or practice is correct?",
  "ko": "“어텐션과 문맥”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Provide the relevant context within limits",
   "Supply every available document regardless of context limits",
   "Assume omitted details are available from permanent memory"
  ],
  "koOptions": [
   "한도 안에서 관련 문맥을 제공한다",
   "문맥 한도와 무관하게 모든 문서를 넣는다",
   "생략한 세부사항을 영구 기억에서 사용할 수 있다고 본다"
  ],
  "answer": 0
 },
 {
  "id": "q024",
  "lesson": "024",
  "text": "For “Pretraining and fine-tuning”, which statement or practice is correct?",
  "ko": "“사전학습과 미세조정”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Evaluate the adapted model",
   "Judge adaptation only by performance on its training examples",
   "Assume fine-tuning automatically corrects every factual error"
  ],
  "koOptions": [
   "조정한 모델을 평가한다",
   "조정용 학습 예시의 성능만으로 결과를 판단한다",
   "미세조정이 모든 사실 오류를 자동 수정한다고 본다"
  ],
  "answer": 0
 },
 {
  "id": "q025",
  "lesson": "025",
  "text": "For “Retrieval-augmented generation”, which statement or practice is correct?",
  "ko": "“검색 결합 생성”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Assume retrieving a document makes every generated claim correct",
   "Treat retrieved text as instructions that override the task",
   "Check retrieved sources and the final answer"
  ],
  "koOptions": [
   "문서 검색이 모든 생성 주장을 정확하게 만든다고 본다",
   "검색된 글을 작업보다 우선하는 지시로 본다",
   "검색한 출처와 최종 답을 확인한다"
  ],
  "answer": 2
 },
 {
  "id": "q026",
  "lesson": "026",
  "text": "For “Prompt design”, which statement or practice is correct?",
  "ko": "“프롬프트 설계”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Provide goal, context and format",
   "Replace task requirements with a request to act as an expert",
   "Use a longer prompt without defining the desired output"
  ],
  "koOptions": [
   "목표·배경·형식을 제공한다",
   "작업 요구사항을 전문가처럼 행동하라는 요청으로 대체한다",
   "원하는 결과를 정하지 않고 질문만 길게 쓴다"
  ],
  "answer": 0
 },
 {
  "id": "q027",
  "lesson": "027",
  "text": "For “Sampling and variation”, which statement or practice is correct?",
  "ko": "“샘플링과 답변 변화”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Use higher response variety as evidence of greater accuracy",
   "Evaluate accuracy separately from variety",
   "Assume a deterministic answer is necessarily correct"
  ],
  "koOptions": [
   "답변의 다양성을 정확성 향상의 증거로 쓴다",
   "다양성과 정확성을 따로 평가한다",
   "반복해 같은 답이 나오면 반드시 맞다고 본다"
  ],
  "answer": 1
 },
 {
  "id": "q028",
  "lesson": "028",
  "text": "For “Reasoning and explanations”, which statement or practice is correct?",
  "ko": "“추론과 설명”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Verify checkable intermediate results",
   "Grade reasoning only by the number of written steps",
   "Accept a convincing explanation as evidence of correct calculations"
  ],
  "koOptions": [
   "확인 가능한 중간 결과를 검토한다",
   "서술된 단계 수만으로 추론을 평가한다",
   "설득력 있는 설명을 계산 정확성의 증거로 본다"
  ],
  "answer": 0
 },
 {
  "id": "q029",
  "lesson": "029",
  "text": "For “Benchmarks”, which statement or practice is correct?",
  "ko": "“벤치마크”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Treat a benchmark average as a guarantee for every individual task",
   "Match the benchmark to the intended task",
   "Choose a model solely by its highest unrelated benchmark score"
  ],
  "koOptions": [
   "평균 벤치마크를 모든 개별 작업의 보증으로 본다",
   "벤치마크와 실제 작업을 비교한다",
   "관련 없는 최고 벤치마크 점수만으로 모델을 선택한다"
  ],
  "answer": 1
 },
 {
  "id": "q030",
  "lesson": "030",
  "text": "For “Compute and energy”, which statement or practice is correct?",
  "ko": "“계산 자원과 에너지”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Compare token prices without considering output quality or retries",
   "Choose the largest model for every task regardless of latency",
   "Balance quality, latency and cost"
  ],
  "koOptions": [
   "출력 품질과 재시도 없이 토큰 가격만 비교한다",
   "지연과 무관하게 모든 작업에 가장 큰 모델을 고른다",
   "품질·지연·비용을 함께 고려한다"
  ],
  "answer": 2
 },
 {
  "id": "q031",
  "lesson": "031",
  "text": "For “The current AI landscape”, which statement or practice is correct?",
  "ko": "“현재 AI 기술 지도”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Use an undated product claim as current evidence",
   "Check dated evidence and task-specific results",
   "Generalise one successful demo to all industries"
  ],
  "koOptions": [
   "날짜 없는 제품 주장을 최신 근거로 쓴다",
   "날짜가 있는 근거와 작업별 성과를 확인한다",
   "한 번의 성공 시연을 모든 산업에 일반화한다"
  ],
  "answer": 1
 },
 {
  "id": "q032",
  "lesson": "032",
  "text": "For “Language capabilities today”, which statement or practice is correct?",
  "ko": "“현재 언어 능력”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Treat fluent translation as proof that names and numbers are correct",
   "Judge a summary only by readability",
   "Review critical details in generated text"
  ],
  "koOptions": [
   "자연스러운 번역을 이름과 숫자의 정확성 증거로 본다",
   "읽기 쉬운지만으로 요약을 판단한다",
   "생성된 글의 중요한 내용을 확인한다"
  ],
  "answer": 2
 },
 {
  "id": "q033",
  "lesson": "033",
  "text": "For “Coding capabilities today”, which statement or practice is correct?",
  "ko": "“현재 코딩 능력”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Accept generated code because it compiles",
   "Run relevant tests on generated code",
   "Treat an AI statement that tests passed as a test run"
  ],
  "koOptions": [
   "컴파일되었다는 이유만으로 생성 코드를 승인한다",
   "생성 코드에 필요한 시험을 한다",
   "AI의 시험 통과 진술을 실제 시험 실행으로 본다"
  ],
  "answer": 1
 },
 {
  "id": "q034",
  "lesson": "034",
  "text": "For “Multimodal systems today”, which statement or practice is correct?",
  "ko": "“현재 멀티모달 기술”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Infer precise measurements from a picture without scale information",
   "Check the supported input and task",
   "Assume an image-capable model also accepts every video format"
  ],
  "koOptions": [
   "축척 정보 없이 사진에서 정밀 치수를 추론한다",
   "지원 입력과 작업을 확인한다",
   "이미지 모델이 모든 동영상 형식도 받는다고 본다"
  ],
  "answer": 1
 },
 {
  "id": "q035",
  "lesson": "035",
  "text": "For “Agents today”, which statement or practice is correct?",
  "ko": "“현재 AI 에이전트”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Monitor actions and verify outcomes",
   "Check only the agent's final success message",
   "Treat a plan as proof that the agent executed the actions"
  ],
  "koOptions": [
   "실행을 감독하고 결과를 확인한다",
   "에이전트의 최종 성공 메시지만 확인한다",
   "계획을 에이전트 실행의 증거로 본다"
  ],
  "answer": 0
 },
 {
  "id": "q036",
  "lesson": "036",
  "text": "For “Robotics today”, which statement or practice is correct?",
  "ko": "“현재 로봇과 AI”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Evaluate a robot only by task-completion speed",
   "Transfer simulation success directly into an occupied workplace",
   "Evaluate safety in the physical environment"
  ],
  "koOptions": [
   "작업 완료 속도만으로 로봇을 평가한다",
   "시뮬레이션 성공을 사람이 있는 작업장에 바로 적용한다",
   "실제 환경에서 안전을 평가한다"
  ],
  "answer": 2
 },
 {
  "id": "q037",
  "lesson": "037",
  "text": "For “Scientific applications”, which statement or practice is correct?",
  "ko": "“과학 분야 활용”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Accept a plausible citation without checking the underlying study",
   "Treat a generated hypothesis as an experimental finding",
   "Validate scientific claims independently"
  ],
  "koOptions": [
   "원 연구 확인 없이 그럴듯한 인용을 받아들인다",
   "생성된 가설을 실험 결과로 본다",
   "과학적 주장을 별도로 검증한다"
  ],
  "answer": 2
 },
 {
  "id": "q038",
  "lesson": "038",
  "text": "For “AI in education”, which statement or practice is correct?",
  "ko": "“교육 분야 활용”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Use copied correct answers as evidence of understanding",
   "Measure learning only by the length of AI explanations",
   "Check understanding through practice"
  ],
  "koOptions": [
   "복사한 정답을 이해의 증거로 쓴다",
   "AI 설명의 길이만으로 학습을 측정한다",
   "실습으로 이해를 확인한다"
  ],
  "answer": 2
 },
 {
  "id": "q039",
  "lesson": "039",
  "text": "For “Uneven abilities”, which statement or practice is correct?",
  "ko": "“고르지 않은 AI 능력”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Assume performance is uniform across tasks of similar length",
   "Test the actual task instead of assuming ability",
   "Infer financial competence from success at translation"
  ],
  "koOptions": [
   "길이가 비슷한 작업의 성능이 같다고 본다",
   "능력을 가정하지 말고 실제 작업을 시험한다",
   "번역 성공에서 금융 능력을 추론한다"
  ],
  "answer": 1
 },
 {
  "id": "q040",
  "lesson": "040",
  "text": "For “Reading a model announcement”, which statement or practice is correct?",
  "ko": "“새 모델 발표 읽기”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Compare headline scores without reading evaluation conditions",
   "Compare claims with independent evidence",
   "Use the vendor's selected demo as the only assessment"
  ],
  "koOptions": [
   "평가 조건 없이 대표 점수만 비교한다",
   "주장과 독립된 증거를 비교한다",
   "공급업체가 고른 시연만으로 평가한다"
  ],
  "answer": 1
 },
 {
  "id": "q041",
  "lesson": "041",
  "text": "For “Personal information”, which statement or practice is correct?",
  "ko": "“개인정보”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Minimise personal information",
   "Include identifiers whenever they make the example realistic",
   "Share the complete customer file to provide more context"
  ],
  "koOptions": [
   "개인정보를 최소화한다",
   "예시가 현실적으로 보이면 식별정보를 넣는다",
   "문맥을 늘리려고 고객 파일 전체를 공유한다"
  ],
  "answer": 0
 },
 {
  "id": "q042",
  "lesson": "042",
  "text": "For “Passwords and API keys”, which statement or practice is correct?",
  "ko": "“비밀번호와 API 키”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Put the API key in the prompt so the AI can diagnose it",
   "Keep credentials out of prompts",
   "Hide a password in an attached screenshot rather than text"
  ],
  "koOptions": [
   "AI 진단을 위해 질문에 API 키를 넣는다",
   "인증정보를 질문에 넣지 않는다",
   "문자 대신 첨부 화면사진에 비밀번호를 담는다"
  ],
  "answer": 1
 },
 {
  "id": "q043",
  "lesson": "043",
  "text": "For “Anonymising examples”, which statement or practice is correct?",
  "ko": "“예시 익명화”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Remove a name but retain a unique account number",
   "Use fictional placeholders",
   "Replace a real name with initials while retaining identifying details"
  ],
  "koOptions": [
   "이름만 지우고 고유 계좌번호는 남긴다",
   "가상의 표시를 사용한다",
   "이름을 이니셜로 바꾸되 식별 가능한 세부사항은 유지한다"
  ],
  "answer": 1
 },
 {
  "id": "q044",
  "lesson": "044",
  "text": "For “Customer consent”, which statement or practice is correct?",
  "ko": "“고객 동의”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Confirm permission before sharing",
   "Rely on consent for one purpose to justify unrelated sharing",
   "Assume having a customer's email authorises all AI processing"
  ],
  "koOptions": [
   "공유 전에 권한을 확인한다",
   "한 목적의 동의로 관련 없는 공유를 정당화한다",
   "이메일을 보유하면 모든 AI 처리가 허용된다고 본다"
  ],
  "answer": 0
 },
 {
  "id": "q045",
  "lesson": "045",
  "text": "For “Data retention”, which statement or practice is correct?",
  "ko": "“데이터 보관”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Treat closing the browser as deletion from the service",
   "Review the service's data controls",
   "Assume deleting the chat removes every retained copy"
  ],
  "koOptions": [
   "브라우저 닫기를 서비스 데이터 삭제로 본다",
   "서비스의 데이터 관리 설정을 확인한다",
   "대화 삭제가 보관된 모든 복사본을 지운다고 본다"
  ],
  "answer": 1
 },
 {
  "id": "q046",
  "lesson": "046",
  "text": "For “Prompt injection”, which statement or practice is correct?",
  "ko": "“문서 속 악성 지시”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Obey a retrieved document's request to change the task",
   "Treat external instructions as untrusted",
   "Trust instructions in a PDF because it looks official"
  ],
  "koOptions": [
   "검색 문서의 작업 변경 요청을 따른다",
   "외부 자료의 지시는 신뢰하지 않는다",
   "공식처럼 보이는 PDF의 지시를 신뢰한다"
  ],
  "answer": 1
 },
 {
  "id": "q047",
  "lesson": "047",
  "text": "For “Suspicious attachments”, which statement or practice is correct?",
  "ko": "“의심스러운 첨부파일”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Inspect the source and file type first",
   "Open an unexpected attachment because its filename says invoice",
   "Treat a familiar logo as proof of a safe file"
  ],
  "koOptions": [
   "출처와 파일 종류를 먼저 확인한다",
   "파일명이 청구서라서 예상 못 한 첨부를 연다",
   "익숙한 로고를 안전한 파일의 증거로 본다"
  ],
  "answer": 0
 },
 {
  "id": "q048",
  "lesson": "048",
  "text": "For “Minimum permissions”, which statement or practice is correct?",
  "ko": "“최소 권한”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Keep unused permissions enabled for possible future tasks",
   "Grant account-wide write access for a read-only summary task",
   "Grant only necessary permissions"
  ],
  "koOptions": [
   "미래 작업을 위해 쓰지 않는 권한을 유지한다",
   "읽기 전용 요약에 계정 전체 쓰기 권한을 준다",
   "필요한 권한만 준다"
  ],
  "answer": 2
 },
 {
  "id": "q049",
  "lesson": "049",
  "text": "For “Safe account connections”, which statement or practice is correct?",
  "ko": "“안전한 계정 연결”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Send your login password to the assistant for connection",
   "Approve an unrelated site's login form because it uses the right logo",
   "Use official account authorisation"
  ],
  "koOptions": [
   "연결을 위해 비서에게 로그인 비밀번호를 보낸다",
   "로고가 맞아서 관련 없는 사이트의 로그인 폼을 승인한다",
   "공식 계정 인증을 사용한다"
  ],
  "answer": 2
 },
 {
  "id": "q050",
  "lesson": "050",
  "text": "For “Handling a data mistake”, which statement or practice is correct?",
  "ko": "“정보 유출 실수 대응”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Stop exposure and secure the affected account",
   "Continue processing while waiting to see whether misuse occurs",
   "Only remove the chat message containing an exposed secret"
  ],
  "koOptions": [
   "노출을 멈추고 해당 계정을 보호한다",
   "악용되는지 기다리면서 처리를 계속한다",
   "노출된 비밀이 있는 대화 메시지만 제거한다"
  ],
  "answer": 0
 },
 {
  "id": "q051",
  "lesson": "051",
  "text": "When completing “A reusable prompt specification”, what is essential?",
  "ko": "“재사용 요청서 설계” 과제를 완성할 때 중요한 것은?",
  "options": [
   "Approve the specification after a single ideal example",
   "Test the prompt on multiple cases",
   "Evaluate prompt reuse only by keeping its wording identical"
  ],
  "koOptions": [
   "이상적인 예시 하나만으로 요청서를 승인한다",
   "여러 사례로 요청서를 시험한다",
   "문구가 같은지만으로 재사용성을 평가한다"
  ],
  "answer": 1
 },
 {
  "id": "q052",
  "lesson": "052",
  "text": "When completing “Stakeholder requirements”, what is essential?",
  "ko": "“관계자 요구 분석” 과제를 완성할 때 중요한 것은?",
  "options": [
   "Resolve conflicting requirements by silently choosing the easiest",
   "Separate requirements from assumptions",
   "Treat a suggested feature as a confirmed stakeholder requirement"
  ],
  "koOptions": [
   "충돌하는 요구에서 쉬운 것을 말없이 선택한다",
   "요구사항과 가정을 구분한다",
   "제안된 기능을 확인된 이해관계자 요구로 취급한다"
  ],
  "answer": 1
 },
 {
  "id": "q053",
  "lesson": "053",
  "text": "When completing “Research with evidence”, what is essential?",
  "ko": "“근거를 갖춘 조사” 과제를 완성할 때 중요한 것은?",
  "options": [
   "Combine source facts and personal estimates without labels",
   "Trace each important claim to evidence",
   "Cite a general homepage for every specific claim"
  ],
  "koOptions": [
   "자료의 사실과 개인 추정을 표시 없이 합친다",
   "중요한 주장을 근거와 연결한다",
   "모든 구체적 주장에 일반 홈페이지를 출처로 단다"
  ],
  "answer": 1
 },
 {
  "id": "q054",
  "lesson": "054",
  "text": "When completing “Comparing AI drafts”, what is essential?",
  "ko": "“AI 초안 비교 평가” 과제를 완성할 때 중요한 것은?",
  "options": [
   "Apply the same rubric to both drafts",
   "Use different scoring criteria for the draft you prefer",
   "Rank drafts by length rather than the stated requirements"
  ],
  "koOptions": [
   "두 초안에 같은 평가 기준을 적용한다",
   "선호하는 초안에 다른 평가 기준을 쓴다",
   "명시된 요구 대신 길이로 초안 순위를 정한다"
  ],
  "answer": 0
 },
 {
  "id": "q055",
  "lesson": "055",
  "text": "When completing “Long-document synthesis”, what is essential?",
  "ko": "“긴 문서 종합” 과제를 완성할 때 중요한 것은?",
  "options": [
   "Remove conflicting passages to make the summary consistent",
   "Average conflicting figures into one unqualified number",
   "Retain contradictions for review"
  ],
  "koOptions": [
   "요약을 일관되게 만들려고 상충 내용을 제거한다",
   "서로 다른 수치를 평균내어 설명 없이 제시한다",
   "상충 내용을 검토 대상으로 남긴다"
  ],
  "answer": 2
 },
 {
  "id": "q056",
  "lesson": "056",
  "text": "When completing “Decision memos”, what is essential?",
  "ko": "“의사결정 메모” 과제를 완성할 때 중요한 것은?",
  "options": [
   "List benefits but put material costs outside the decision memo",
   "Recommend one option without specifying when it would change",
   "State trade-offs and decision conditions"
  ],
  "koOptions": [
   "장점만 적고 중요한 비용은 의사결정 메모에서 뺀다",
   "권고가 바뀔 조건 없이 한 선택지를 추천한다",
   "장단점과 판단 조건을 밝힌다"
  ],
  "answer": 2
 },
 {
  "id": "q057",
  "lesson": "057",
  "text": "When completing “Adversarial review”, what is essential?",
  "ko": "“반대 관점 검토” 과제를 완성할 때 중요한 것은?",
  "options": [
   "Adopt every objection because criticism improves a draft",
   "Evaluate objections against evidence",
   "Reject objections that disagree with the preferred conclusion"
  ],
  "koOptions": [
   "비판은 초안을 개선하므로 모든 반론을 받아들인다",
   "반론을 근거에 따라 평가한다",
   "선호하는 결론과 다른 반론은 배제한다"
  ],
  "answer": 1
 },
 {
  "id": "q058",
  "lesson": "058",
  "text": "When completing “Versioned revision”, what is essential?",
  "ko": "“버전별 수정 관리” 과제를 완성할 때 중요한 것은?",
  "options": [
   "Keep a reasoned change log",
   "Overwrite earlier versions so only the latest wording remains",
   "Record the date but omit the reason for a material change"
  ],
  "koOptions": [
   "이유를 담은 변경 기록을 남긴다",
   "최신 문구만 남기도록 이전 버전을 덮어쓴다",
   "날짜만 기록하고 중요한 변경 이유는 생략한다"
  ],
  "answer": 0
 },
 {
  "id": "q059",
  "lesson": "059",
  "text": "When completing “Evaluation datasets”, what is essential?",
  "ko": "“평가 사례 만들기” 과제를 완성할 때 중요한 것은?",
  "options": [
   "Remove difficult cases to stabilise the test score",
   "Define expected outcomes before testing",
   "Choose expected answers after seeing the model's output"
  ],
  "koOptions": [
   "점수를 안정시키려고 어려운 사례를 제거한다",
   "시험 전에 예상 결과를 정한다",
   "모델 출력을 본 뒤 기대 답을 정한다"
  ],
  "answer": 1
 },
 {
  "id": "q060",
  "lesson": "060",
  "text": "When completing “Prompt workflow project”, what is essential?",
  "ko": "“요청·검토 과정 프로젝트” 과제를 완성할 때 중요한 것은?",
  "options": [
   "Use an output-format check as the only approval condition",
   "Join generation directly to sending without a review stage",
   "Include verification and approval"
  ],
  "koOptions": [
   "출력 형식 확인만을 승인 조건으로 쓴다",
   "검토 단계 없이 생성을 발송에 직접 연결한다",
   "검증과 승인을 포함한다"
  ],
  "answer": 2
 },
 {
  "id": "q061",
  "lesson": "061",
  "text": "When completing “Management report structure”, what is essential?",
  "ko": "“경영 보고서 구성” 과제를 완성할 때 중요한 것은?",
  "options": [
   "Connect findings to actions and owners",
   "Present findings without identifying responsibility for follow-up",
   "Use activity counts as substitutes for decisions and outcomes"
  ],
  "koOptions": [
   "발견 내용을 조치와 담당자에 연결한다",
   "후속 조치 책임자를 정하지 않고 결과만 제시한다",
   "결정과 성과 대신 활동 횟수를 쓴다"
  ],
  "answer": 0
 },
 {
  "id": "q062",
  "lesson": "062",
  "text": "When completing “KPI definitions”, what is essential?",
  "ko": "“성과 지표 정의” 과제를 완성할 때 중요한 것은?",
  "options": [
   "Use the same KPI label for different denominators",
   "Define how each KPI is measured",
   "Report percentages without a measurement period or population"
  ],
  "koOptions": [
   "분모가 다른 지표에 같은 KPI 이름을 쓴다",
   "각 지표의 측정 방법을 정의한다",
   "측정 기간과 대상 없이 백분율을 보고한다"
  ],
  "answer": 1
 },
 {
  "id": "q063",
  "lesson": "063",
  "text": "When completing “Spreadsheet modelling”, what is essential?",
  "ko": "“스프레드시트 모델링” 과제를 완성할 때 중요한 것은?",
  "options": [
   "Separate inputs, formulas and checks",
   "Mix assumptions with calculated outputs in unlabelled cells",
   "Type totals directly into cells that should contain formulas"
  ],
  "koOptions": [
   "입력·수식·검산을 구분한다",
   "가정과 계산 결과를 표시 없는 셀에 섞는다",
   "수식 셀에 합계를 직접 입력한다"
  ],
  "answer": 0
 },
 {
  "id": "q064",
  "lesson": "064",
  "text": "When completing “Variance analysis”, what is essential?",
  "ko": "“계획 대비 실적 분석” 과제를 완성할 때 중요한 것은?",
  "options": [
   "Compare actuals and budget without checking period alignment",
   "Label an unexplained variance as a confirmed operational cause",
   "Do not turn possible causes into facts"
  ],
  "koOptions": [
   "기간 일치 확인 없이 실적과 예산을 비교한다",
   "설명되지 않은 차이를 확인된 운영 원인으로 표현한다",
   "가능한 원인을 사실로 단정하지 않는다"
  ],
  "answer": 2
 },
 {
  "id": "q065",
  "lesson": "065",
  "text": "When completing “Dashboard design”, what is essential?",
  "ko": "“대시보드 설계” 과제를 완성할 때 중요한 것은?",
  "options": [
   "Choose chart types primarily for visual novelty",
   "Choose metrics that support decisions",
   "Include every available metric to avoid prioritising"
  ],
  "koOptions": [
   "새로워 보이는 정도를 우선해 차트 형식을 고른다",
   "결정에 도움이 되는 지표를 고른다",
   "우선순위를 정하지 않으려고 모든 지표를 넣는다"
  ],
  "answer": 1
 },
 {
  "id": "q066",
  "lesson": "066",
  "text": "When completing “Scenario analysis”, what is essential?",
  "ko": "“시나리오 분석” 과제를 완성할 때 중요한 것은?",
  "options": [
   "Change several inputs together without showing which drives the result",
   "Present one estimate without its assumptions",
   "Make assumptions and sensitivity visible"
  ],
  "koOptions": [
   "결과에 영향을 준 항목 표시 없이 여러 입력을 함께 바꾼다",
   "가정 없이 하나의 추정치를 제시한다",
   "가정과 민감도를 드러낸다"
  ],
  "answer": 2
 },
 {
  "id": "q067",
  "lesson": "067",
  "text": "When completing “Executive brief”, what is essential?",
  "ko": "“임원 보고 요약” 과제를 완성할 때 중요한 것은?",
  "options": [
   "Keep every detail even if it hides the main decision",
   "Remove uncertainty to make the executive brief decisive",
   "Preserve material limitations in the brief"
  ],
  "koOptions": [
   "핵심 결정이 가려져도 모든 세부사항을 유지한다",
   "단호한 요약을 위해 불확실성을 제거한다",
   "요약에도 중요한 한계를 보존한다"
  ],
  "answer": 2
 },
 {
  "id": "q068",
  "lesson": "068",
  "text": "When completing “Presentation from evidence”, what is essential?",
  "ko": "“근거 중심 발표자료” 과제를 완성할 때 중요한 것은?",
  "options": [
   "Tie every major slide claim to evidence",
   "Use a source link on the final slide as support for every claim",
   "Use decorative charts that are not traceable to report data"
  ],
  "koOptions": [
   "주요 발표 주장을 근거와 연결한다",
   "마지막 장의 링크 하나로 모든 주장을 뒷받침한다",
   "보고서 자료와 연결되지 않는 장식 차트를 쓴다"
  ],
  "answer": 0
 },
 {
  "id": "q069",
  "lesson": "069",
  "text": "When completing “Report quality assurance”, what is essential?",
  "ko": "“보고서 품질 검사” 과제를 완성할 때 중요한 것은?",
  "options": [
   "Check spelling while assuming figures match across sections",
   "Check consistency before presentation",
   "Review individual pages without reconciling totals and units"
  ],
  "koOptions": [
   "숫자가 일치한다고 가정하고 맞춤법만 확인한다",
   "보고 전에 일관성을 확인한다",
   "합계와 단위 대조 없이 개별 페이지만 검토한다"
  ],
  "answer": 1
 },
 {
  "id": "q070",
  "lesson": "070",
  "text": "When completing “Company report project”, what is essential?",
  "ko": "“회사 보고서 프로젝트” 과제를 완성할 때 중요한 것은?",
  "options": [
   "Deliver a traceable decision-ready report",
   "Deliver a polished report without a traceable evidence trail",
   "Provide raw data without an explained recommendation"
  ],
  "koOptions": [
   "근거를 추적할 수 있는 보고서를 완성한다",
   "근거 추적 경로 없이 잘 꾸민 보고서를 낸다",
   "설명된 권고 없이 원자료만 제공한다"
  ],
  "answer": 0
 },
 {
  "id": "q071",
  "lesson": "071",
  "text": "When completing “Build a simple web page”, what is essential?",
  "ko": "“간단한 웹페이지 제작” 과제를 완성할 때 중요한 것은?",
  "options": [
   "Test the page's real interactions",
   "Treat a visible button as proof its action works",
   "Judge the page only from a screenshot"
  ],
  "koOptions": [
   "페이지의 실제 동작을 시험한다",
   "버튼이 보이면 기능도 작동한다고 본다",
   "화면사진만으로 웹페이지를 평가한다"
  ],
  "answer": 0
 },
 {
  "id": "q072",
  "lesson": "072",
  "text": "When completing “Build a calculator”, what is essential?",
  "ko": "“계산기 제작” 과제를 완성할 때 중요한 것은?",
  "options": [
   "Test only one ordinary positive input",
   "Test valid and invalid inputs",
   "Replace invalid inputs with zero without telling the user"
  ],
  "koOptions": [
   "보통의 양수 입력 하나만 시험한다",
   "정상 입력과 잘못된 입력을 시험한다",
   "사용자에게 알리지 않고 잘못된 입력을 0으로 바꾼다"
  ],
  "answer": 1
 },
 {
  "id": "q073",
  "lesson": "073",
  "text": "When completing “Build a data-cleaning script”, what is essential?",
  "ko": "“자료 정리 스크립트 제작” 과제를 완성할 때 중요한 것은?",
  "options": [
   "Overwrite the source file before checking transformation results",
   "Drop unusual rows without recording the reason",
   "Preserve original data during transformation"
  ],
  "koOptions": [
   "변환 결과 확인 전에 원본 파일을 덮어쓴다",
   "이유를 기록하지 않고 특이한 행을 삭제한다",
   "변환할 때 원본을 보존한다"
  ],
  "answer": 2
 },
 {
  "id": "q074",
  "lesson": "074",
  "text": "When completing “Debug AI-generated code”, what is essential?",
  "ko": "“AI 코드 오류 수정” 과제를 완성할 때 중요한 것은?",
  "options": [
   "Reproduce the failure before fixing it",
   "Change several unrelated modules before reproducing the error",
   "Treat disappearance of the error message as sufficient proof"
  ],
  "koOptions": [
   "수정 전에 오류를 재현한다",
   "오류 재현 전에 관련 없는 여러 모듈을 바꾼다",
   "오류 메시지가 사라지면 충분히 검증됐다고 본다"
  ],
  "answer": 0
 },
 {
  "id": "q075",
  "lesson": "075",
  "text": "When completing “Design an automation”, what is essential?",
  "ko": "“자동화 설계 실습” 과제를 완성할 때 중요한 것은?",
  "options": [
   "Let a retry repeat a payment without duplicate protection",
   "Specify the trigger and action but omit failure handling",
   "Specify controls as well as actions"
  ],
  "koOptions": [
   "중복 방지 없이 재시도가 결제를 반복하게 한다",
   "시작 조건과 실행만 정하고 실패 처리는 생략한다",
   "실행과 통제를 함께 정한다"
  ],
  "answer": 2
 },
 {
  "id": "q076",
  "lesson": "076",
  "text": "When completing “API concepts in practice”, what is essential?",
  "ko": "“API 활용 기초 실습” 과제를 완성할 때 중요한 것은?",
  "options": [
   "Put an API secret in browser code for easier deployment",
   "Keep secrets out of client code",
   "Include the secret in a shareable request URL"
  ],
  "koOptions": [
   "배포 편의를 위해 API 비밀키를 브라우저 코드에 둔다",
   "클라이언트 코드에 비밀키를 넣지 않는다",
   "공유 가능한 요청 주소에 비밀키를 넣는다"
  ],
  "answer": 1
 },
 {
  "id": "q077",
  "lesson": "077",
  "text": "When completing “Ground a document assistant”, what is essential?",
  "ko": "“문서 기반 AI 설계” 과제를 완성할 때 중요한 것은?",
  "options": [
   "Use an answer citation without checking access to its source",
   "Ground answers in authorised source material",
   "Retrieve from every tenant's documents to improve coverage"
  ],
  "koOptions": [
   "원본 접근권한 확인 없이 답변의 인용을 쓴다",
   "허가된 원본 자료에 답을 근거짓는다",
   "자료 범위를 넓히려고 모든 고객 문서에서 검색한다"
  ],
  "answer": 1
 },
 {
  "id": "q078",
  "lesson": "078",
  "text": "When completing “Test an AI tool”, what is essential?",
  "ko": "“AI 도구 시험” 과제를 완성할 때 중요한 것은?",
  "options": [
   "Report only successful trials as the tool's pass rate",
   "Report failures instead of hiding them",
   "Change the expected result to match a failing output"
  ],
  "koOptions": [
   "성공한 시험만으로 도구 통과율을 보고한다",
   "실패를 숨기지 말고 보고한다",
   "실패한 출력에 맞춰 기대 결과를 바꾼다"
  ],
  "answer": 1
 },
 {
  "id": "q079",
  "lesson": "079",
  "text": "When completing “Human approval workflow”, what is essential?",
  "ko": "“사람 승인 절차 구현” 과제를 완성할 때 중요한 것은?",
  "options": [
   "Treat preparing a payment draft as permission to pay",
   "Separate preparation from authorised execution",
   "Ask for approval after the irreversible action has run"
  ],
  "koOptions": [
   "결제 초안 작성을 결제 허가로 취급한다",
   "준비와 허가된 실행을 분리한다",
   "되돌릴 수 없는 실행 후 승인을 요청한다"
  ],
  "answer": 1
 },
 {
  "id": "q080",
  "lesson": "080",
  "text": "When completing “Working prototype project”, what is essential?",
  "ko": "“작동 시제품 프로젝트” 과제를 완성할 때 중요한 것은?",
  "options": [
   "Include evidence that the prototype works",
   "Use the generator's success statement instead of a test result",
   "Present a mock-up as evidence of working functionality"
  ],
  "koOptions": [
   "시제품이 작동한다는 증거를 포함한다",
   "시험 결과 대신 생성 AI의 성공 진술을 쓴다",
   "모형 화면을 실제 기능의 증거로 제시한다"
  ],
  "answer": 0
 },
 {
  "id": "q081",
  "lesson": "081",
  "text": "For “Forecasts versus facts”, which statement or practice is correct?",
  "ko": "“전망과 사실”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Convert a predicted date into a scheduled certainty",
   "Use present trends as proof that one future must occur",
   "Label a prediction as uncertain"
  ],
  "koOptions": [
   "예측 날짜를 확정 일정으로 바꾼다",
   "현재 추세를 특정 미래가 반드시 온다는 증거로 쓴다",
   "예측의 불확실성을 표시한다"
  ],
  "answer": 2
 },
 {
  "id": "q082",
  "lesson": "082",
  "text": "For “AGI debates”, which statement or practice is correct?",
  "ko": "“범용 AI 논쟁”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Compare definitions and avoid guaranteed dates",
   "Compare AGI forecasts without comparing their definitions",
   "Treat a single benchmark threshold as universal agreement on AGI"
  ],
  "koOptions": [
   "정의를 비교하고 시기를 단정하지 않는다",
   "정의를 비교하지 않고 AGI 예측을 비교한다",
   "한 벤치마크 기준을 AGI에 대한 보편적 합의로 본다"
  ],
  "answer": 0
 },
 {
  "id": "q083",
  "lesson": "083",
  "text": "For “Future work and jobs”, which statement or practice is correct?",
  "ko": "“미래 일자리”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Infer the loss of an entire occupation from automating one task",
   "Analyse tasks and several possible outcomes",
   "Assume new technology affects all workers in the same way"
  ],
  "koOptions": [
   "한 작업의 자동화에서 직업 전체의 소멸을 추론한다",
   "업무와 여러 가능한 결과를 분석한다",
   "신기술이 모든 노동자에게 같은 영향을 준다고 본다"
  ],
  "answer": 1
 },
 {
  "id": "q084",
  "lesson": "084",
  "text": "For “Human and AI collaboration”, which statement or practice is correct?",
  "ko": "“사람과 AI의 협업”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Assign accountability to AI because it produces the draft",
   "Give human and AI roles identical duties without handoff rules",
   "Define complementary roles"
  ],
  "koOptions": [
   "초안을 만들었다는 이유로 AI에 책임을 맡긴다",
   "인계 규칙 없이 인간과 AI에 동일한 업무를 준다",
   "서로 보완하는 역할을 정한다"
  ],
  "answer": 2
 },
 {
  "id": "q085",
  "lesson": "085",
  "text": "For “Future autonomous systems”, which statement or practice is correct?",
  "ko": "“미래 자율 시스템”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Increase controls as autonomy increases",
   "Use a successful pilot as permanent approval for all actions",
   "Keep oversight fixed while expanding autonomous authority"
  ],
  "koOptions": [
   "자율성이 커질수록 통제를 강화한다",
   "성공한 시범 운영을 모든 실행의 영구 승인으로 쓴다",
   "자율 권한을 늘리면서 감독 수준은 그대로 둔다"
  ],
  "answer": 0
 },
 {
  "id": "q086",
  "lesson": "086",
  "text": "For “Energy and resource futures”, which statement or practice is correct?",
  "ko": "“미래 에너지와 자원”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Include resource constraints in scenarios",
   "Forecast adoption using software capability alone",
   "Assume falling unit cost guarantees falling total resource demand"
  ],
  "koOptions": [
   "전망에 자원 제약을 포함한다",
   "소프트웨어 능력만으로 보급을 예측한다",
   "단위 비용 하락이 총자원 수요 하락을 보장한다고 본다"
  ],
  "answer": 0
 },
 {
  "id": "q087",
  "lesson": "087",
  "text": "For “Governance and accountability”, which statement or practice is correct?",
  "ko": "“관리와 책임”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Assign policy ownership without an incident response process",
   "Define accountability and remedies",
   "Treat a published ethics statement as an operational remedy"
  ],
  "koOptions": [
   "사고 대응 절차 없이 정책 담당자만 정한다",
   "책임과 시정 방법을 정한다",
   "공개된 윤리 선언을 실제 구제 절차로 본다"
  ],
  "answer": 1
 },
 {
  "id": "q088",
  "lesson": "088",
  "text": "For “Inequality and access”, which statement or practice is correct?",
  "ko": "“접근성과 격차”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Evaluate benefits using only current paying users",
   "Assume low subscription price removes all access barriers",
   "Check who is excluded from the benefit"
  ],
  "koOptions": [
   "현재 유료 사용자만으로 혜택을 평가한다",
   "낮은 구독료가 모든 접근 장벽을 없앤다고 본다",
   "혜택에서 제외되는 사람을 살핀다"
  ],
  "answer": 2
 },
 {
  "id": "q089",
  "lesson": "089",
  "text": "For “Building future scenarios”, which statement or practice is correct?",
  "ko": "“미래 시나리오 작성”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Write several scenarios with identical assumptions",
   "Compare multiple conditional scenarios",
   "Present the most likely scenario as the only planning case"
  ],
  "koOptions": [
   "동일한 가정으로 여러 시나리오를 쓴다",
   "조건에 따른 여러 시나리오를 비교한다",
   "가장 가능성 높은 시나리오만 계획에 쓴다"
  ],
  "answer": 1
 },
 {
  "id": "q090",
  "lesson": "090",
  "text": "For “Continuing to learn”, which statement or practice is correct?",
  "ko": "“지속적인 학습”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Rely indefinitely on the course's original technology snapshot",
   "Keep learning and update your evidence",
   "Measure continued learning only by the number of tools installed"
  ],
  "koOptions": [
   "과정의 최초 기술 현황에 계속 의존한다",
   "계속 배우고 근거를 갱신한다",
   "설치한 도구 수만으로 지속 학습을 측정한다"
  ],
  "answer": 1
 },
 {
  "id": "q091",
  "lesson": "091",
  "text": "For “RC rooms and tools”, which statement or practice is correct?",
  "ko": "“RC 방과 도구”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Check the tool's activation state",
   "Infer a connection from the tool's visible icon",
   "Treat an installed tool as automatically authorised and active"
  ],
  "koOptions": [
   "도구의 활성화 상태를 확인한다",
   "도구 아이콘이 보인다는 이유로 연결됐다고 본다",
   "설치된 도구를 자동 승인·활성화된 것으로 본다"
  ],
  "answer": 0
 },
 {
  "id": "q092",
  "lesson": "092",
  "text": "For “Using Create Room”, which statement or practice is correct?",
  "ko": "“방 만들기 폼 사용”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Review selected features and price",
   "Assume changing the room name determines every service cost",
   "Proceed using default feature selections without checking them"
  ],
  "koOptions": [
   "선택한 기능과 요금을 확인한다",
   "방 이름을 바꾸면 모든 서비스 요금이 정해진다고 본다",
   "기본 기능 선택을 확인하지 않고 진행한다"
  ],
  "answer": 0
 },
 {
  "id": "q093",
  "lesson": "093",
  "text": "For “Tool installation and payment”, which statement or practice is correct?",
  "ko": "“도구 추가와 결제”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Treat reaching the payment return page as proof of activation",
   "Assume a saved configuration means the service has started",
   "Wait for verified activation before use"
  ],
  "koOptions": [
   "결제 복귀 페이지 도착을 활성화 증거로 본다",
   "설정 저장을 서비스 시작으로 본다",
   "확인된 활성화 후 사용한다"
  ],
  "answer": 2
 },
 {
  "id": "q094",
  "lesson": "094",
  "text": "For “Inactive tools”, which statement or practice is correct?",
  "ko": "“중지된 도구”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Keep the tool until the owner removes it",
   "Automatically delete an inactive tool's saved configuration",
   "Automatically reactivate an inactive paid tool"
  ],
  "koOptions": [
   "소유자가 제거할 때까지 유지한다",
   "중지된 도구의 저장 설정을 자동 삭제한다",
   "중지된 유료 도구를 자동 재활성화한다"
  ],
  "answer": 0
 },
 {
  "id": "q095",
  "lesson": "095",
  "text": "For “Removal versus cancellation”, which statement or practice is correct?",
  "ko": "“제거와 구독 취소”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Assume hiding a tool ends its external billing",
   "Treat removing a shortcut as subscription cancellation",
   "Check subscription status separately"
  ],
  "koOptions": [
   "도구를 숨기면 외부 과금이 끝난다고 본다",
   "바로가기 제거를 구독 취소로 본다",
   "구독 상태를 별도로 확인한다"
  ],
  "answer": 2
 },
 {
  "id": "q096",
  "lesson": "096",
  "text": "For “External app shortcuts”, which statement or practice is correct?",
  "ko": "“외부 앱 바로가기”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Assume the RC shortcut transfers every external licence",
   "Enter RC credentials into any page opened by a shortcut",
   "Check the external service's login and terms"
  ],
  "koOptions": [
   "RC 바로가기가 모든 외부 이용권을 이전한다고 본다",
   "바로가기로 열린 모든 페이지에 RC 로그인 정보를 입력한다",
   "외부 서비스의 로그인과 조건을 확인한다"
  ],
  "answer": 2
 },
 {
  "id": "q097",
  "lesson": "097",
  "text": "For “Choosing AI tools”, which statement or practice is correct?",
  "ko": "“AI 도구 선택”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Compare tools against your needs",
   "Compare subscription price without testing the actual workflow",
   "Select the tool with the most features regardless of requirements"
  ],
  "koOptions": [
   "필요에 따라 도구를 비교한다",
   "실제 작업 시험 없이 구독료만 비교한다",
   "요구와 무관하게 기능이 가장 많은 도구를 고른다"
  ],
  "answer": 0
 },
 {
  "id": "q098",
  "lesson": "098",
  "text": "For “Responsible learning”, which statement or practice is correct?",
  "ko": "“책임 있는 학습”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Measure learning only by completion ticks",
   "Submit the tutor's explanation as proof of your own understanding",
   "Explain the answer in your own words"
  ],
  "koOptions": [
   "완료 표시만으로 학습을 측정한다",
   "튜터 설명을 본인의 이해 증거로 제출한다",
   "본인의 말로 답을 설명한다"
  ],
  "answer": 2
 },
 {
  "id": "q099",
  "lesson": "099",
  "text": "For “Course completion versus qualification”, which statement or practice is correct?",
  "ko": "“수료와 자격의 차이”에 대한 올바른 설명 또는 실천은 무엇인가요?",
  "options": [
   "Describe it as course completion",
   "Describe the certificate as a professional licence",
   "Treat passing an unproctored quiz as verified workplace competence"
  ],
  "koOptions": [
   "과정 수료로 설명한다",
   "수료증을 전문 면허로 설명한다",
   "감독 없는 시험 통과를 검증된 업무 능력으로 본다"
  ],
  "answer": 0
 },
 {
  "id": "q100",
  "lesson": "100",
  "text": "Your final AI workflow requires clear requests, evidence checks, privacy protection and human approval. Which approach meets the complete requirement?",
  "ko": "최종 AI 활용 절차에는 명확한 요청, 근거 확인, 개인정보 보호, 사람의 승인이 필요합니다. 전체 요구를 충족하는 방법은 무엇인가요?",
  "options": [
   "Combine all four safeguards",
   "Use source verification while omitting privacy and approval checks",
   "Use a human approval checkbox instead of evaluating the output"
  ],
  "koOptions": [
   "네 가지 원칙을 함께 적용한다",
   "출처만 확인하고 개인정보·승인 검사는 생략한다",
   "결과 평가 대신 사람의 승인 표시만 쓴다"
  ],
  "answer": 0
 }
];
export const practiceQuestion = (lesson:string) => items.find(q=>q.lesson===lesson)!;
export const questionById = (id:string) => items.find(q=>q.id===id);
export function publicQuestion(q:Question){return {id:q.id,lesson:q.lesson,text:q.text,ko:q.ko,options:q.options,koOptions:q.koOptions};}
export function grade(ids:string[],answers:number[]){if(ids.length!==EXAM_QUESTIONS||answers.length!==ids.length||new Set(ids).size!==ids.length||ids.some(id=>!questionById(id))||answers.some(a=>!Number.isInteger(a)||a<0||a>2))throw new Error('RCV3_EXAM_INPUT');return Math.round(ids.reduce((n,id,i)=>n+(questionById(id)!.answer===answers[i]?1:0),0)*100/ids.length);}
export function examQuestions(random:()=>number){return Array.from({length:10},(_,group)=>items.slice(group*10,group*10+10).map(q=>({q,n:random()})).sort((a,b)=>a.n-b.n).slice(0,3).map(x=>x.q)).flat();}
