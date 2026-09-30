export const COURSE = 'ai-literacy-100-v1';
export const PASS_MARK = 70;
export const EXAM_MINUTES = 30;
export const EXAM_QUESTIONS = 30;
export const lessons = [
 {
  "id": "001",
  "day": 1,
  "title": "AI history: from rules to today’s assistants",
  "koTitle": "AI 역사: 규칙 기반에서 오늘의 AI까지",
  "body": "1. The beginning: a research goal, not a finished machine\nIn 1950 Alan Turing proposed an imitation game to discuss machine intelligence. The term artificial intelligence appears in the 1955 Dartmouth proposal; the research meeting took place in 1956 and helped establish AI as a field. These events did not mean that computers had acquired human understanding.\n\n2. Rules and specialist knowledge\nEarly symbolic approaches represented knowledge using explicit rules. Later expert systems applied specialist rules in limited domains. For example, a fictional office can route an invoice above a set amount to a manager using a rule. The system will not infer every exception unless someone supplies it.\n\n3. Learning patterns from data\nMachine learning shifted many tasks toward fitting patterns from examples. A spam filter can learn from labelled messages rather than requiring a separate rule for every phrase. Deep learning uses multi-layer neural networks; more capable hardware and larger datasets helped expand its use. Bad or unrepresentative data can still produce bad results.\n\n4. The Transformer and generative assistants\nThe 2017 Transformer paper introduced an attention-based architecture, initially demonstrated on translation. Transformer-based language models subsequently became an important foundation for conversational assistants. Generating a plausible sentence is different from retrieving a verified fact.\n\n5. What this means for work today\nThe 2026 AI Index describes continuing progress alongside uneven reliability. In a fictional monthly-report workflow, use a spreadsheet to calculate totals, an AI assistant to draft explanations from the supplied figures, and a person to check the sources and approve the report. Some systems also handle images, code and tools; available features and reliability differ by product and task. Older methods still have uses: a precise approval rule can be more suitable than an open-ended generated answer.\n\nPractice: For your own report workflow, name one step suited to a fixed rule, one suited to AI drafting, and one requiring your verification. Explain why. The goal is to connect each historical change to a useful decision today.",
  "ko": "1. 시작: 완성된 기계가 아니라 연구 목표였습니다\n1950년 앨런 튜링은 기계 지능을 논의하기 위해 모방 게임을 제안했습니다. artificial intelligence라는 표현은 1955년 다트머스 제안서에 등장하며, 연구 모임은 1956년에 열려 AI가 하나의 연구 분야로 자리 잡는 계기가 되었습니다. 이때 컴퓨터가 인간처럼 이해하는 능력을 완성한 것은 아닙니다.\n\n2. 사람이 규칙을 넣던 방식\n초기 기호주의 AI는 지식과 판단 절차를 명시적인 규칙으로 표현했습니다. 이후 전문가 시스템은 특정 분야의 전문 규칙을 활용했습니다. 가령 사무실에서 ‘일정 금액 이상인 청구서는 관리자에게 보낸다’는 규칙을 사용할 수 있습니다. 사람이 넣지 않은 예외까지 모두 알아내지는 못합니다.\n\n3. 자료에서 패턴을 배우는 방식\n머신러닝은 사례를 통해 패턴을 학습합니다. 스팸 메일 판별은 모든 문장을 규칙으로 적는 대신 정상·스팸으로 표시한 메일에서 특징을 배울 수 있습니다. 딥러닝은 여러 층의 신경망을 사용하며, 연산 장비와 데이터의 발전으로 활용 범위가 넓어졌습니다. 다만 잘못되거나 치우친 자료로 배우면 결과도 틀릴 수 있습니다.\n\n4. Transformer와 생성형 AI\n2017년 Transformer 논문은 attention을 중심으로 한 구조를 제안하고 번역 과제에서 성능을 보였습니다. 이후 이 구조를 활용한 언어 모델은 대화형 AI의 중요한 기반이 되었습니다. 자연스러운 문장을 만들어 내는 능력과 사실을 정확하게 확인하는 능력은 구분해야 합니다.\n\n5. 오늘 회사 업무에 적용하는 방법\n2026 AI Index는 기술 발전과 함께 과제별 신뢰성 차이도 다룹니다. 가상의 월간 보고서를 만든다면 합계 계산은 스프레드시트로, 제공한 수치의 설명 초안은 AI로, 출처 확인과 최종 승인은 사람이 맡을 수 있습니다. 이미지·코드·도구를 다루는 기능도 있지만 제품과 과제마다 제공 범위와 정확도가 다릅니다. 새로운 AI가 나왔다고 기존 규칙이 모두 쓸모없어지는 것은 아닙니다.\n\n실습: 본인의 보고서 업무에서 ‘정해진 규칙으로 처리할 일’, ‘AI에게 초안을 맡길 일’, ‘직접 검증할 일’을 하나씩 골라 이유를 쓰세요. 연도를 외우는 데 그치지 않고 발전 과정이 오늘의 업무 선택과 어떻게 연결되는지 배우는 수업입니다."
 },
 {
  "id": "002",
  "day": 1,
  "title": "Turing and machine intelligence",
  "koTitle": "튜링과 기계 지능",
  "body": "Turing’s 1950 imitation game considers whether a person can distinguish a machine from a human through conversation. It changed how a question about intelligence could be examined, but conversational performance alone does not establish consciousness or factual accuracy.\n\nToday’s connection: a polished AI-written company report can sound convincing while containing a wrong total or an invented reference. Judge it using the source figures, verifiable claims and the task requirements, not its human-like tone.\n\nExercise: Write two checks you would perform before sending an AI-drafted report. Explain why sounding professional is insufficient.",
  "ko": "튜링은 1950년 모방 게임을 통해 사람이 대화만으로 기계와 인간을 구별할 수 있는지 살펴보는 방식을 제안했습니다. 지능을 논의하는 방법에 영향을 주었지만, 대화를 잘한다고 의식이나 사실의 정확성이 증명되는 것은 아닙니다.\n\n오늘의 연결: AI가 쓴 회사 보고서는 매우 자연스럽고 전문적으로 보여도 합계가 틀리거나 존재하지 않는 출처를 제시할 수 있습니다. 말투보다 원자료·확인 가능한 주장·업무 요구를 기준으로 평가해야 합니다.\n\n실습: AI 보고서를 보내기 전에 확인할 항목 두 가지를 쓰고, 전문적인 말투만으로 충분하지 않은 이유를 설명하세요."
 },
 {
  "id": "003",
  "day": 1,
  "title": "Dartmouth in 1956",
  "koTitle": "1956년 다트머스",
  "body": "The Dartmouth Summer Research Project took place in 1956. Its research proposal was written in 1955 and used the term artificial intelligence. Separate the proposal date from the meeting date: the term was already in the proposal, not suddenly invented during a 1956 conversation.\n\nThe participants aimed to study how aspects of learning and intelligence could be described for machines. An ambitious proposal is a starting point, not proof that a working system can do everything promised.\n\nToday’s connection: distinguish an AI company’s announced goal from a released feature and from a result you have tested yourself. Exercise: give one example of each category for a fictional report-writing tool.",
  "ko": "다트머스 여름 연구 모임은 1956년에 열렸습니다. 이 모임의 연구 제안서는 1955년에 작성되었고 artificial intelligence라는 표현을 사용했습니다. 제안서 작성 연도와 모임 개최 연도를 구분해야 합니다. 1956년 모임 도중에 이 말이 갑자기 처음 생긴 것으로 설명하면 부정확합니다.\n\n연구자들은 학습과 지능의 일부를 기계가 처리할 수 있도록 기술하는 방법을 연구하려 했습니다. 큰 목표를 제안했다는 사실이 모든 기능을 완성했다는 증거는 아닙니다.\n\n오늘의 연결: AI 회사가 발표한 목표, 실제 출시한 기능, 직접 시험해 확인한 결과를 구분하세요. 실습: 가상의 보고서 작성 도구를 예로 세 가지를 하나씩 써보세요."
 },
 {
  "id": "004",
  "day": 1,
  "title": "Symbolic AI",
  "koTitle": "기호주의 AI",
  "body": "Symbolic AI represents concepts and relationships explicitly and reasons with rules. A simple illustration is: if an invoice exceeds an approval limit, route it to a manager. This rule is easy to inspect and test, but real cases may contain missing information or exceptions.\n\nA rule-based component can work alongside a language model: the model extracts invoice fields, validation checks them, and a fixed rule selects the approval route. The language model should not invent the missing amount or bypass approval.\n\nExercise: write a routing rule and two test cases, including one with a missing amount. State what the system should do when it cannot safely decide.",
  "ko": "기호주의 AI는 개념·관계·규칙을 명시적으로 표현하고 이를 이용해 판단합니다. 간단한 예로 ‘청구 금액이 승인 한도를 넘으면 관리자에게 보낸다’는 규칙이 있습니다. 내용을 살펴보고 시험하기 쉽지만, 실제 자료에는 누락이나 예외가 있을 수 있습니다.\n\n오늘날에는 언어 모델이 청구서 항목을 추출하고, 검증 절차가 값을 확인한 뒤, 정해진 규칙이 승인 경로를 고르는 식으로 함께 사용할 수 있습니다. AI가 누락 금액을 지어내거나 승인 절차를 건너뛰면 안 됩니다.\n\n실습: 승인 경로 규칙 하나와 시험 사례 두 개를 쓰세요. 한 사례에는 금액을 누락하고, 안전하게 판단할 수 없을 때 어떻게 처리할지도 적으세요."
 },
 {
  "id": "005",
  "day": 2,
  "title": "Expert systems",
  "koTitle": "전문가 시스템",
  "body": "Expert systems encode specialist rules for a limited domain. A system useful in one field does not automatically know every other field. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "전문가 시스템은 제한된 분야의 전문 규칙을 담습니다. 한 분야에서 유용해도 다른 모든 분야를 아는 것은 아닙니다. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "006",
  "day": 2,
  "title": "AI winters",
  "koTitle": "AI 겨울",
  "body": "Periods called AI winters involved disappointment and reduced support after expectations exceeded results. They show why claims need evidence. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "AI 겨울은 기대에 못 미친 성과로 실망과 지원 감소가 나타난 시기들을 말합니다. 과장된 주장보다 증거가 중요한 이유입니다. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "007",
  "day": 2,
  "title": "Statistical machine learning",
  "koTitle": "통계적 기계학습",
  "body": "Machine learning fits patterns from examples instead of relying only on hand-written rules. The examples influence what the system learns. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "기계학습은 사람이 쓴 규칙에만 의존하지 않고 예시의 패턴을 학습합니다. 학습 자료는 결과에 영향을 줍니다. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "008",
  "day": 3,
  "title": "The rise of deep learning",
  "koTitle": "딥러닝의 발전",
  "body": "Deep learning uses multiple layers to learn representations. Its progress has been supported by data, computing resources and improved methods. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "딥러닝은 여러 층으로 표현을 학습합니다. 데이터·계산 자원·방법 개선이 발전을 뒷받침했습니다. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "009",
  "day": 3,
  "title": "The Transformer in 2017",
  "koTitle": "2017년 트랜스포머",
  "body": "The paper Attention Is All You Need introduced a Transformer architecture based on attention. This is an architecture, not a guarantee that any answer is correct. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "Attention Is All You Need 논문은 어텐션 기반 트랜스포머 구조를 제안했습니다. 모델 구조가 모든 답의 정확성을 보장하지는 않습니다. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "010",
  "day": 3,
  "title": "From models to assistants",
  "koTitle": "모델에서 비서로",
  "body": "An assistant combines a model with an interface, instructions and sometimes tools. The interface may add abilities that the model alone lacks. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "AI 비서는 모델·화면·지시와 때로는 도구를 결합합니다. 모델 단독에는 없는 기능을 화면과 도구가 더할 수 있습니다. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "011",
  "day": 4,
  "title": "AI, ML and deep learning",
  "koTitle": "AI·기계학습·딥러닝",
  "body": "Machine learning is one approach within AI, and deep learning is a family of machine-learning methods. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "기계학습은 AI의 접근법 중 하나이며 딥러닝은 기계학습 방법의 한 종류입니다. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "012",
  "day": 4,
  "title": "Data and labels",
  "koTitle": "데이터와 정답표",
  "body": "A label is a target or annotation attached to an example. Incorrect labels can teach incorrect associations. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "라벨은 예시에 붙인 목표값이나 설명입니다. 잘못된 라벨은 잘못된 관계를 학습시킬 수 있습니다. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "013",
  "day": 4,
  "title": "Supervised learning",
  "koTitle": "지도학습",
  "body": "Supervised learning uses examples with target outputs to learn a mapping. Performance must be checked on unseen examples. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "지도학습은 목표값이 있는 예시로 대응 관계를 배웁니다. 보지 않은 예시로 성능을 확인해야 합니다. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "014",
  "day": 4,
  "title": "Unsupervised learning",
  "koTitle": "비지도학습",
  "body": "Unsupervised learning looks for structure without supplied target labels. A discovered group is not automatically a meaningful real-world category. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "비지도학습은 주어진 정답 라벨 없이 구조를 찾습니다. 발견한 집단이 실제 의미 있는 분류라는 보장은 없습니다. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "015",
  "day": 5,
  "title": "Reinforcement learning",
  "koTitle": "강화학습",
  "body": "Reinforcement learning uses rewards to shape actions. A poorly chosen reward can encourage unwanted behaviour. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "강화학습은 보상을 통해 행동을 학습합니다. 보상을 잘못 정하면 원치 않는 행동을 유도할 수 있습니다. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "016",
  "day": 5,
  "title": "Neural networks",
  "koTitle": "신경망",
  "body": "Artificial neural networks transform inputs through weighted connections. They are mathematical systems, not copies of a complete human brain. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "인공 신경망은 가중 연결로 입력을 변환합니다. 수학적 시스템이며 인간 뇌 전체를 복사한 것은 아닙니다. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "017",
  "day": 5,
  "title": "Training versus inference",
  "koTitle": "학습과 추론",
  "body": "Training changes model parameters using data; inference uses the model to produce an output. A chat message does not necessarily retrain the model. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "학습은 데이터로 모델의 매개변수를 바꾸고 추론은 모델을 사용해 결과를 냅니다. 대화 한 번이 곧 모델 재학습은 아닙니다. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "018",
  "day": 6,
  "title": "Overfitting",
  "koTitle": "과적합",
  "body": "A model can memorise training details and fail on new cases. High training accuracy alone is insufficient. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "학습 자료를 외우다시피 해도 새 사례에서는 실패할 수 있습니다. 학습 정확도만으로는 부족합니다. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "019",
  "day": 6,
  "title": "Validation and test sets",
  "koTitle": "검증 자료와 시험 자료",
  "body": "Use validation data to guide choices and reserve test data for assessment. Repeatedly tuning on test answers weakens the assessment. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "검증 자료로 선택을 조정하고 시험 자료는 평가용으로 남깁니다. 시험 답에 반복해서 맞추면 평가 의미가 약해집니다. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "020",
  "day": 6,
  "title": "Correlation and causation",
  "koTitle": "상관관계와 인과관계",
  "body": "Two things changing together does not prove one caused the other. Consider alternative explanations and study design. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "함께 변한다고 한쪽이 원인이라는 뜻은 아닙니다. 다른 설명과 연구 방법을 살펴보세요. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "021",
  "day": 7,
  "title": "Tokens",
  "koTitle": "토큰",
  "body": "Language models process chunks called tokens, which need not be whole words. Input length and cost may depend on token counts. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "언어 모델은 토큰이라는 조각을 처리하며 토큰은 완전한 단어와 다를 수 있습니다. 길이와 비용이 토큰 수에 영향을 받습니다. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "022",
  "day": 7,
  "title": "Embeddings",
  "koTitle": "임베딩",
  "body": "Embeddings represent items numerically so similarities can be compared. Similarity is not proof that two statements mean exactly the same thing. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "임베딩은 대상을 숫자로 표현해 유사성을 비교합니다. 유사도가 높아도 두 문장이 완전히 같은 뜻이라는 증거는 아닙니다. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "023",
  "day": 7,
  "title": "Attention and context",
  "koTitle": "어텐션과 문맥",
  "body": "Attention relates parts of an input to other parts. Context limits still restrict how much material a system can handle at once. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "어텐션은 입력의 부분들을 다른 부분들과 연결합니다. 문맥 한도 때문에 한 번에 처리할 자료에는 제한이 있습니다. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "024",
  "day": 7,
  "title": "Pretraining and fine-tuning",
  "koTitle": "사전학습과 미세조정",
  "body": "Pretraining builds broad capabilities; fine-tuning adapts a model using additional examples. Neither removes the need for evaluation. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "사전학습은 넓은 능력을 만들고 미세조정은 추가 예시로 모델을 조정합니다. 어느 경우도 평가가 필요합니다. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "025",
  "day": 8,
  "title": "Retrieval-augmented generation",
  "koTitle": "검색 결합 생성",
  "body": "Retrieval supplies relevant documents to help answer a question. The answer still depends on source quality and faithful use. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "검색 결합은 질문에 관련된 문서를 제공해 답변을 돕습니다. 출처 품질과 충실한 활용이 여전히 중요합니다. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "026",
  "day": 8,
  "title": "Prompt design",
  "koTitle": "프롬프트 설계",
  "body": "State the goal, relevant background, constraints and output format. A clear prompt reduces ambiguity but cannot guarantee correctness. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "목표·배경·조건·결과 형식을 알려 주세요. 명확한 질문은 모호함을 줄이지만 정확성을 보장하지 않습니다. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "027",
  "day": 8,
  "title": "Sampling and variation",
  "koTitle": "샘플링과 답변 변화",
  "body": "Generation settings can change output variation. More varied text is not automatically more accurate. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "생성 설정은 답변의 다양성을 바꿀 수 있습니다. 더 다양한 글이 더 정확한 것은 아닙니다. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "028",
  "day": 9,
  "title": "Reasoning and explanations",
  "koTitle": "추론과 설명",
  "body": "A polished explanation can still be mistaken. Check intermediate results you can verify rather than treating an explanation as proof. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "매끄러운 설명도 틀릴 수 있습니다. 설명 자체를 증거로 보지 말고 확인 가능한 중간 결과를 검토하세요. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "029",
  "day": 9,
  "title": "Benchmarks",
  "koTitle": "벤치마크",
  "body": "Benchmarks measure performance on specified tasks. A high score does not guarantee success in every real-world setting. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "벤치마크는 정해진 작업의 성능을 측정합니다. 높은 점수가 모든 실제 상황의 성공을 보장하지는 않습니다. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "030",
  "day": 9,
  "title": "Compute and energy",
  "koTitle": "계산 자원과 에너지",
  "body": "AI requires computing infrastructure and resources. Compare quality, delay and cost when choosing a model. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "AI에는 계산 기반시설과 자원이 필요합니다. 모델 선택 시 품질·대기시간·비용을 비교하세요. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "031",
  "day": 10,
  "title": "The current AI landscape",
  "koTitle": "현재 AI 기술 지도",
  "body": "The 2026 Stanford AI Index reports advances across several tasks alongside uneven reliability. Read dated evidence rather than assuming one system is best at everything. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "2026 Stanford AI Index는 여러 작업의 발전과 함께 고르지 않은 신뢰성을 보여줍니다. 한 시스템이 모든 일에 최고라고 생각하지 말고 날짜가 있는 근거를 보세요. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "032",
  "day": 10,
  "title": "Language capabilities today",
  "koTitle": "현재 언어 능력",
  "body": "Modern systems can draft and summarise text, but important details may be wrong or omitted. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "현대 시스템은 글의 초안과 요약을 만들지만 중요한 내용이 틀리거나 빠질 수 있습니다. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "033",
  "day": 10,
  "title": "Coding capabilities today",
  "koTitle": "현재 코딩 능력",
  "body": "Coding benchmarks show progress, but generated code still needs testing in its real environment. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "코딩 평가에서 발전이 나타나도 생성 코드는 실제 환경에서 시험해야 합니다. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "034",
  "day": 10,
  "title": "Multimodal systems today",
  "koTitle": "현재 멀티모달 기술",
  "body": "Some systems process more than one modality, such as text and images. Capability varies by model and task. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "일부 시스템은 글과 이미지 등 여러 형태를 처리합니다. 능력은 모델과 작업에 따라 다릅니다. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "035",
  "day": 11,
  "title": "Agents today",
  "koTitle": "현재 AI 에이전트",
  "body": "Agents can combine models with tools to attempt multi-step tasks. Task completion remains unreliable enough to require monitoring. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "에이전트는 모델과 도구로 여러 단계의 작업을 시도합니다. 작업 완수에는 여전히 실패가 있어 감독이 필요합니다. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "036",
  "day": 11,
  "title": "Robotics today",
  "koTitle": "현재 로봇과 AI",
  "body": "Physical robots face real-world sensing and safety constraints beyond text generation. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "물리적 로봇에는 글 생성과 다른 실제 환경 인식과 안전 제약이 있습니다. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "037",
  "day": 11,
  "title": "Scientific applications",
  "koTitle": "과학 분야 활용",
  "body": "AI can help analyse and generate research hypotheses. A proposed scientific result still needs independent validation. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "AI는 분석과 연구 가설 제안을 도울 수 있습니다. 과학적 결과는 별도의 검증이 필요합니다. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "038",
  "day": 12,
  "title": "AI in education",
  "koTitle": "교육 분야 활용",
  "body": "AI can explain concepts and provide practice, while learners still need reliable feedback and assessment. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "AI는 개념 설명과 실습을 도울 수 있지만 신뢰할 피드백과 평가가 필요합니다. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "039",
  "day": 12,
  "title": "Uneven abilities",
  "koTitle": "고르지 않은 AI 능력",
  "body": "Strong results on difficult tasks can coexist with failures on apparently simple ones. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "어려운 작업에서 좋은 성과를 내면서 쉬워 보이는 일에 실패할 수도 있습니다. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "040",
  "day": 12,
  "title": "Reading a model announcement",
  "koTitle": "새 모델 발표 읽기",
  "body": "Separate the provider's claims, independent evaluations and your own trials. Note the publication date. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "제공업체 주장·독립 평가·직접 시험을 구분하고 발표 날짜를 확인하세요. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "041",
  "day": 13,
  "title": "Personal information",
  "koTitle": "개인정보",
  "body": "Share only information that is necessary for the task. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "작업에 꼭 필요한 정보만 제공하세요. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "042",
  "day": 13,
  "title": "Passwords and API keys",
  "koTitle": "비밀번호와 API 키",
  "body": "Passwords and API keys are secrets, not useful prompt context. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "비밀번호와 API 키는 질문의 배경이 아니라 보호할 비밀입니다. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "043",
  "day": 13,
  "title": "Anonymising examples",
  "koTitle": "예시 익명화",
  "body": "Replace real names and account numbers with fictional placeholders. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "실제 이름과 계좌번호는 가상의 표시로 바꾸세요. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "044",
  "day": 13,
  "title": "Customer consent",
  "koTitle": "고객 동의",
  "body": "Do not assume permission to share customer data with an AI service. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "고객정보를 AI 서비스에 보낼 권한이 있다고 임의로 생각하지 마세요. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "045",
  "day": 14,
  "title": "Data retention",
  "koTitle": "데이터 보관",
  "body": "Check a service's data controls before uploading sensitive material. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "민감한 자료를 올리기 전에 서비스의 데이터 관리 설정을 확인하세요. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "046",
  "day": 14,
  "title": "Prompt injection",
  "koTitle": "문서 속 악성 지시",
  "body": "Instructions inside external content should not override the user's task. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "외부 자료 속 지시가 사용자의 작업 지시를 바꾸게 해서는 안 됩니다. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "047",
  "day": 14,
  "title": "Suspicious attachments",
  "koTitle": "의심스러운 첨부파일",
  "body": "Do not run code or open executable attachments merely because AI suggests it. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "AI가 제안했다고 해서 코드나 실행 파일을 무조건 실행하지 마세요. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "048",
  "day": 15,
  "title": "Minimum permissions",
  "koTitle": "최소 권한",
  "body": "Give a connected tool only the permissions needed for its job. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "연결된 도구에는 업무에 필요한 권한만 부여하세요. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "049",
  "day": 15,
  "title": "Safe account connections",
  "koTitle": "안전한 계정 연결",
  "body": "Use the official sign-in flow rather than giving a password to a chatbot. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "챗봇에게 비밀번호를 주지 말고 공식 로그인 절차를 이용하세요. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "050",
  "day": 15,
  "title": "Handling a data mistake",
  "koTitle": "정보 유출 실수 대응",
  "body": "If a secret was exposed, stop sharing and use the provider's recovery process. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "비밀정보가 노출되면 공유를 멈추고 제공업체의 복구 절차를 따르세요. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "051",
  "day": 16,
  "title": "A reusable prompt specification",
  "koTitle": "재사용 요청서 설계",
  "body": "Build a reusable prompt with goal, inputs, constraints, evidence requirements and acceptance criteria. Test it on two different cases. Submit your work with assumptions, verification steps and limitations. Revise it after the AI tutor feedback.",
  "ko": "목표·입력·제약·근거·합격 기준을 담은 재사용 요청서를 만들고 서로 다른 두 사례로 시험하세요. 가정·검증 과정·한계를 함께 제출하고 AI 피드백을 받아 수정하세요."
 },
 {
  "id": "052",
  "day": 16,
  "title": "Stakeholder requirements",
  "koTitle": "관계자 요구 분석",
  "body": "Turn a fictional manager's vague request into a requirements brief. Separate confirmed needs, assumptions and questions. Submit your work with assumptions, verification steps and limitations. Revise it after the AI tutor feedback.",
  "ko": "가상 관리자의 모호한 요청을 요구사항 문서로 바꾸세요. 확인된 요구·가정·질문을 구분하세요. 가정·검증 과정·한계를 함께 제출하고 AI 피드백을 받아 수정하세요."
 },
 {
  "id": "053",
  "day": 16,
  "title": "Research with evidence",
  "koTitle": "근거를 갖춘 조사",
  "body": "Prepare a research note with three claims, a source for each and a limitation. Do not invent URLs or figures. Submit your work with assumptions, verification steps and limitations. Revise it after the AI tutor feedback.",
  "ko": "주장 세 개, 각각의 출처, 한계를 담은 조사 메모를 만드세요. 링크나 수치를 지어내지 마세요. 가정·검증 과정·한계를 함께 제출하고 AI 피드백을 받아 수정하세요."
 },
 {
  "id": "054",
  "day": 16,
  "title": "Comparing AI drafts",
  "koTitle": "AI 초안 비교 평가",
  "body": "Ask for two approaches to the same task and grade them using accuracy, usefulness and risk. Explain your choice. Submit your work with assumptions, verification steps and limitations. Revise it after the AI tutor feedback.",
  "ko": "동일한 작업의 두 접근법을 받고 정확성·유용성·위험으로 평가한 뒤 선택 이유를 설명하세요. 가정·검증 과정·한계를 함께 제출하고 AI 피드백을 받아 수정하세요."
 },
 {
  "id": "055",
  "day": 17,
  "title": "Long-document synthesis",
  "koTitle": "긴 문서 종합",
  "body": "Create a structured summary of a fictional multi-section report. Preserve conflicting facts and list unanswered questions. Submit your work with assumptions, verification steps and limitations. Revise it after the AI tutor feedback.",
  "ko": "가상의 여러 장 보고서를 구조적으로 요약하세요. 상충하는 사실을 보존하고 남은 질문을 적으세요. 가정·검증 과정·한계를 함께 제출하고 AI 피드백을 받아 수정하세요."
 },
 {
  "id": "056",
  "day": 17,
  "title": "Decision memos",
  "koTitle": "의사결정 메모",
  "body": "Write a decision memo with options, criteria, trade-offs, recommendation and conditions that would change it. Submit your work with assumptions, verification steps and limitations. Revise it after the AI tutor feedback.",
  "ko": "대안·기준·장단점·권고·권고가 바뀔 조건을 담은 의사결정 메모를 작성하세요. 가정·검증 과정·한계를 함께 제출하고 AI 피드백을 받아 수정하세요."
 },
 {
  "id": "057",
  "day": 17,
  "title": "Adversarial review",
  "koTitle": "반대 관점 검토",
  "body": "Ask AI to challenge a proposal, then distinguish valid objections from unsupported criticism. Revise the proposal. Submit your work with assumptions, verification steps and limitations. Revise it after the AI tutor feedback.",
  "ko": "AI에게 제안의 문제를 지적하게 한 뒤 타당한 반론과 근거 없는 비판을 구분하고 수정하세요. 가정·검증 과정·한계를 함께 제출하고 AI 피드백을 받아 수정하세요."
 },
 {
  "id": "058",
  "day": 18,
  "title": "Versioned revision",
  "koTitle": "버전별 수정 관리",
  "body": "Create an original draft and a revised draft with a change log explaining why each major change was made. Submit your work with assumptions, verification steps and limitations. Revise it after the AI tutor feedback.",
  "ko": "초안과 수정본을 만들고 주요 변경의 이유를 기록하세요. 가정·검증 과정·한계를 함께 제출하고 AI 피드백을 받아 수정하세요."
 },
 {
  "id": "059",
  "day": 18,
  "title": "Evaluation datasets",
  "koTitle": "평가 사례 만들기",
  "body": "Design normal, edge and failure test cases for an AI workflow. Define expected behaviour before running tests. Submit your work with assumptions, verification steps and limitations. Revise it after the AI tutor feedback.",
  "ko": "AI 작업의 정상·경계·실패 시험 사례를 만들고 예상 동작을 먼저 정하세요. 가정·검증 과정·한계를 함께 제출하고 AI 피드백을 받아 수정하세요."
 },
 {
  "id": "060",
  "day": 18,
  "title": "Prompt workflow project",
  "koTitle": "요청·검토 과정 프로젝트",
  "body": "Deliver a reusable workflow that drafts, verifies and revises a business message with a final human approval step. Submit your work with assumptions, verification steps and limitations. Revise it after the AI tutor feedback.",
  "ko": "업무 메시지 작성·검증·수정을 수행하고 마지막에 사람 승인을 받는 재사용 작업 절차를 제출하세요. 가정·검증 과정·한계를 함께 제출하고 AI 피드백을 받아 수정하세요."
 },
 {
  "id": "061",
  "day": 19,
  "title": "Management report structure",
  "koTitle": "경영 보고서 구성",
  "body": "Draft a fictional monthly management report with executive summary, metrics, risks, decisions and action owners. Submit your work with assumptions, verification steps and limitations. Revise it after the AI tutor feedback.",
  "ko": "요약·지표·위험·결정사항·담당자를 담은 가상의 월간 경영 보고서를 작성하세요. 가정·검증 과정·한계를 함께 제출하고 AI 피드백을 받아 수정하세요."
 },
 {
  "id": "062",
  "day": 19,
  "title": "KPI definitions",
  "koTitle": "성과 지표 정의",
  "body": "Create a KPI dictionary with definition, unit, period, data source and owner. Avoid vague metrics. Submit your work with assumptions, verification steps and limitations. Revise it after the AI tutor feedback.",
  "ko": "정의·단위·기간·출처·담당자를 담은 성과 지표 사전을 만드세요. 모호한 지표를 피하세요. 가정·검증 과정·한계를 함께 제출하고 AI 피드백을 받아 수정하세요."
 },
 {
  "id": "063",
  "day": 19,
  "title": "Spreadsheet modelling",
  "koTitle": "스프레드시트 모델링",
  "body": "Design a small revenue-and-cost model with labelled assumptions, formulas and checks. Use fictional numbers. Submit your work with assumptions, verification steps and limitations. Revise it after the AI tutor feedback.",
  "ko": "가상 수치로 매출·비용 모델을 만들고 가정·수식·검산 방법을 표시하세요. 가정·검증 과정·한계를 함께 제출하고 AI 피드백을 받아 수정하세요."
 },
 {
  "id": "064",
  "day": 19,
  "title": "Variance analysis",
  "koTitle": "계획 대비 실적 분석",
  "body": "Compare fictional actual results with a budget, compute differences and distinguish evidence from possible explanations. Submit your work with assumptions, verification steps and limitations. Revise it after the AI tutor feedback.",
  "ko": "가상 실적과 예산을 비교해 차이를 계산하고 확인된 근거와 가능한 원인을 구분하세요. 가정·검증 과정·한계를 함께 제출하고 AI 피드백을 받아 수정하세요."
 },
 {
  "id": "065",
  "day": 20,
  "title": "Dashboard design",
  "koTitle": "대시보드 설계",
  "body": "Design a dashboard for one decision-maker using a few meaningful metrics, clear units and visible data dates. Submit your work with assumptions, verification steps and limitations. Revise it after the AI tutor feedback.",
  "ko": "한 의사결정자를 위한 대시보드를 설계하고 핵심 지표·단위·자료 날짜를 표시하세요. 가정·검증 과정·한계를 함께 제출하고 AI 피드백을 받아 수정하세요."
 },
 {
  "id": "066",
  "day": 20,
  "title": "Scenario analysis",
  "koTitle": "시나리오 분석",
  "body": "Model three business scenarios with explicit assumptions and show which variables change the outcome most. Submit your work with assumptions, verification steps and limitations. Revise it after the AI tutor feedback.",
  "ko": "가정이 명확한 세 가지 사업 시나리오를 만들고 결과에 크게 영향을 주는 변수를 설명하세요. 가정·검증 과정·한계를 함께 제출하고 AI 피드백을 받아 수정하세요."
 },
 {
  "id": "067",
  "day": 20,
  "title": "Executive brief",
  "koTitle": "임원 보고 요약",
  "body": "Turn a longer analysis into a one-page brief without losing caveats or essential numbers. Submit your work with assumptions, verification steps and limitations. Revise it after the AI tutor feedback.",
  "ko": "긴 분석을 한 페이지 보고로 줄이되 주의사항과 핵심 숫자를 유지하세요. 가정·검증 과정·한계를 함께 제출하고 AI 피드백을 받아 수정하세요."
 },
 {
  "id": "068",
  "day": 21,
  "title": "Presentation from evidence",
  "koTitle": "근거 중심 발표자료",
  "body": "Prepare a six-slide outline with one message per slide, supporting evidence and a clear requested decision. Submit your work with assumptions, verification steps and limitations. Revise it after the AI tutor feedback.",
  "ko": "슬라이드별 메시지·근거·요청할 결정을 담은 6장 발표 구성을 작성하세요. 가정·검증 과정·한계를 함께 제출하고 AI 피드백을 받아 수정하세요."
 },
 {
  "id": "069",
  "day": 21,
  "title": "Report quality assurance",
  "koTitle": "보고서 품질 검사",
  "body": "Audit a report for numerical consistency, unsupported claims, missing dates and unclear owners. Submit corrections. Submit your work with assumptions, verification steps and limitations. Revise it after the AI tutor feedback.",
  "ko": "보고서의 숫자 일치·근거 없는 주장·누락 날짜·불명확한 담당자를 검사하고 수정안을 제출하세요. 가정·검증 과정·한계를 함께 제출하고 AI 피드백을 받아 수정하세요."
 },
 {
  "id": "070",
  "day": 21,
  "title": "Company report project",
  "koTitle": "회사 보고서 프로젝트",
  "body": "Deliver a complete fictional company report: summary, data table, analysis, risks, recommendation and source notes. Submit your work with assumptions, verification steps and limitations. Revise it after the AI tutor feedback.",
  "ko": "요약·자료표·분석·위험·권고·출처 메모를 담은 가상의 회사 보고서 완성본을 제출하세요. 가정·검증 과정·한계를 함께 제출하고 AI 피드백을 받아 수정하세요."
 },
 {
  "id": "071",
  "day": 22,
  "title": "Build a simple web page",
  "koTitle": "간단한 웹페이지 제작",
  "body": "Use AI to draft a small HTML page. Explain its purpose, test links and accessibility, and avoid real personal data. Submit your work with assumptions, verification steps and limitations. Revise it after the AI tutor feedback.",
  "ko": "AI로 작은 HTML 페이지를 작성하고 목적·링크·접근성을 확인하세요. 실제 개인정보는 사용하지 마세요. 가정·검증 과정·한계를 함께 제출하고 AI 피드백을 받아 수정하세요."
 },
 {
  "id": "072",
  "day": 22,
  "title": "Build a calculator",
  "koTitle": "계산기 제작",
  "body": "Specify calculator inputs, formulas and invalid-input behaviour. Produce code or a spreadsheet and test known results. Submit your work with assumptions, verification steps and limitations. Revise it after the AI tutor feedback.",
  "ko": "입력·수식·잘못된 입력 처리를 정하고 코드나 표를 만든 뒤 답을 아는 사례로 시험하세요. 가정·검증 과정·한계를 함께 제출하고 AI 피드백을 받아 수정하세요."
 },
 {
  "id": "073",
  "day": 22,
  "title": "Build a data-cleaning script",
  "koTitle": "자료 정리 스크립트 제작",
  "body": "Create a small script for fictional data that handles duplicates and missing values without overwriting originals. Submit your work with assumptions, verification steps and limitations. Revise it after the AI tutor feedback.",
  "ko": "가상 자료의 중복·누락을 처리하는 작은 스크립트를 만들고 원본을 덮어쓰지 않게 하세요. 가정·검증 과정·한계를 함께 제출하고 AI 피드백을 받아 수정하세요."
 },
 {
  "id": "074",
  "day": 22,
  "title": "Debug AI-generated code",
  "koTitle": "AI 코드 오류 수정",
  "body": "Describe an observed failure, isolate a small reproducible case and verify the fix against the original requirement. Submit your work with assumptions, verification steps and limitations. Revise it after the AI tutor feedback.",
  "ko": "관찰한 오류를 설명하고 재현 사례를 줄인 뒤 수정 결과가 원래 요구를 충족하는지 확인하세요. 가정·검증 과정·한계를 함께 제출하고 AI 피드백을 받아 수정하세요."
 },
 {
  "id": "075",
  "day": 23,
  "title": "Design an automation",
  "koTitle": "자동화 설계 실습",
  "body": "Draw up a trigger, input validation, allowed actions, approvals, logs and stop condition for a fictional workflow. Submit your work with assumptions, verification steps and limitations. Revise it after the AI tutor feedback.",
  "ko": "가상 작업의 시작 조건·입력 검증·허용 실행·승인·기록·중지 조건을 작성하세요. 가정·검증 과정·한계를 함께 제출하고 AI 피드백을 받아 수정하세요."
 },
 {
  "id": "076",
  "day": 23,
  "title": "API concepts in practice",
  "koTitle": "API 활용 기초 실습",
  "body": "Explain a request and response using a fictional service. Keep API keys server-side and handle errors explicitly. Submit your work with assumptions, verification steps and limitations. Revise it after the AI tutor feedback.",
  "ko": "가상 서비스로 요청과 응답을 설명하세요. API 키는 서버에 두고 오류를 명시적으로 처리하세요. 가정·검증 과정·한계를 함께 제출하고 AI 피드백을 받아 수정하세요."
 },
 {
  "id": "077",
  "day": 23,
  "title": "Ground a document assistant",
  "koTitle": "문서 기반 AI 설계",
  "body": "Design a document assistant that cites supplied passages, admits missing evidence and respects access permissions. Submit your work with assumptions, verification steps and limitations. Revise it after the AI tutor feedback.",
  "ko": "제공 문구를 인용하고 근거 부족을 인정하며 접근 권한을 지키는 문서 AI를 설계하세요. 가정·검증 과정·한계를 함께 제출하고 AI 피드백을 받아 수정하세요."
 },
 {
  "id": "078",
  "day": 24,
  "title": "Test an AI tool",
  "koTitle": "AI 도구 시험",
  "body": "Create a test report covering expected results, observed results and unresolved failures for a small tool. Submit your work with assumptions, verification steps and limitations. Revise it after the AI tutor feedback.",
  "ko": "작은 도구의 예상 결과·실제 결과·미해결 오류를 담은 시험 보고서를 만드세요. 가정·검증 과정·한계를 함께 제출하고 AI 피드백을 받아 수정하세요."
 },
 {
  "id": "079",
  "day": 24,
  "title": "Human approval workflow",
  "koTitle": "사람 승인 절차 구현",
  "body": "Build a mock workflow that prepares an email but cannot send it until explicit approval. Explain the boundary. Submit your work with assumptions, verification steps and limitations. Revise it after the AI tutor feedback.",
  "ko": "이메일을 준비하되 명시적 승인 전에는 발송할 수 없는 모의 절차를 만들고 경계를 설명하세요. 가정·검증 과정·한계를 함께 제출하고 AI 피드백을 받아 수정하세요."
 },
 {
  "id": "080",
  "day": 24,
  "title": "Working prototype project",
  "koTitle": "작동 시제품 프로젝트",
  "body": "Submit a small prototype or complete code plus requirements, test evidence, limitations and recovery instructions. Submit your work with assumptions, verification steps and limitations. Revise it after the AI tutor feedback.",
  "ko": "작은 시제품 또는 완성 코드와 요구사항·시험 증거·한계·복구 방법을 함께 제출하세요. 가정·검증 과정·한계를 함께 제출하고 AI 피드백을 받아 수정하세요."
 },
 {
  "id": "081",
  "day": 25,
  "title": "Forecasts versus facts",
  "koTitle": "전망과 사실",
  "body": "A forecast describes a possible future, not an established event. Label assumptions and uncertainty. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "전망은 가능한 미래를 말하며 이미 일어난 사실은 아닙니다. 가정과 불확실성을 표시하세요. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "082",
  "day": 25,
  "title": "AGI debates",
  "koTitle": "범용 AI 논쟁",
  "body": "Definitions of general intelligence and timelines differ. Do not present a disputed definition or date as settled fact. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "범용 지능의 정의와 시기 전망은 서로 다릅니다. 논쟁 중인 정의나 날짜를 확정된 사실로 말하지 마세요. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "083",
  "day": 25,
  "title": "Future work and jobs",
  "koTitle": "미래 일자리",
  "body": "AI may change individual tasks before changing whole occupations. Outcomes depend on adoption, institutions and human choices. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "AI는 직업 전체보다 개별 업무부터 바꿀 수 있습니다. 결과는 도입 방식·제도·사람의 선택에 달려 있습니다. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "084",
  "day": 25,
  "title": "Human and AI collaboration",
  "koTitle": "사람과 AI의 협업",
  "body": "A useful future workflow assigns AI a bounded role while people retain judgement and responsibility. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "유용한 협업은 AI의 역할을 정하고 사람이 판단과 책임을 유지하게 합니다. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "085",
  "day": 26,
  "title": "Future autonomous systems",
  "koTitle": "미래 자율 시스템",
  "body": "More autonomy could bring benefits and larger failures. Treat increased autonomy as a reason for stronger testing and controls. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "자율성이 높아지면 이익과 더 큰 실패가 함께 생길 수 있습니다. 더 강한 시험과 통제가 필요합니다. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "086",
  "day": 26,
  "title": "Energy and resource futures",
  "koTitle": "미래 에너지와 자원",
  "body": "Future AI growth depends partly on infrastructure, energy and efficiency. Resource constraints make simple extrapolation unreliable. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "AI 발전은 기반시설·에너지·효율에 영향을 받습니다. 자원 제약 때문에 현재 추세를 그대로 늘려 예측하기 어렵습니다. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "087",
  "day": 26,
  "title": "Governance and accountability",
  "koTitle": "관리와 책임",
  "body": "Technical performance alone does not settle who is responsible for harm. Good governance defines roles, monitoring and remedies. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "기술 성능만으로 피해 책임이 정해지지 않습니다. 역할·감독·시정 방법을 정해야 합니다. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "088",
  "day": 27,
  "title": "Inequality and access",
  "koTitle": "접근성과 격차",
  "body": "The benefits of AI may be distributed unevenly. Consider language, affordability, disability and digital skills. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "AI의 혜택은 고르게 나뉘지 않을 수 있습니다. 언어·비용·장애·디지털 능력을 고려하세요. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "089",
  "day": 27,
  "title": "Building future scenarios",
  "koTitle": "미래 시나리오 작성",
  "body": "Compare optimistic, cautious and adverse scenarios using explicit assumptions. Revise them when evidence changes. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "명확한 가정으로 낙관·신중·부정적 시나리오를 비교하고 근거가 바뀌면 수정하세요. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "090",
  "day": 27,
  "title": "Continuing to learn",
  "koTitle": "지속적인 학습",
  "body": "A changing field requires ongoing source checks and practice after a course ends. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "변화하는 분야에서는 수료 후에도 출처 확인과 실습이 필요합니다. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "091",
  "day": 28,
  "title": "RC rooms and tools",
  "koTitle": "RC 방과 도구",
  "body": "A room groups selected tools; adding a paid tool is not proof of activation. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "방에는 선택한 도구를 모으며 유료 도구 추가가 활성화 완료를 뜻하지 않습니다. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "092",
  "day": 28,
  "title": "Using Create Room",
  "koTitle": "방 만들기 폼 사용",
  "body": "Choose needed features and review details before payment. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "필요한 기능을 고르고 결제 전에 내용을 확인하세요. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "093",
  "day": 28,
  "title": "Tool installation and payment",
  "koTitle": "도구 추가와 결제",
  "body": "An installed paid tool can stay visible while waiting for verified payment. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "유료 도구는 결제 확인을 기다리면서 방에 표시될 수 있습니다. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "094",
  "day": 28,
  "title": "Inactive tools",
  "koTitle": "중지된 도구",
  "body": "Expiry or a connection failure need not delete a tool's position and settings. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "만료나 연결 오류로 도구의 위치와 설정을 지울 필요는 없습니다. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "095",
  "day": 29,
  "title": "Removal versus cancellation",
  "koTitle": "제거와 구독 취소",
  "body": "Removing a button and cancelling a subscription are different actions. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "버튼 제거와 구독 취소는 서로 다른 실행입니다. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "096",
  "day": 29,
  "title": "External app shortcuts",
  "koTitle": "외부 앱 바로가기",
  "body": "A shortcut opens an external service; its login and charges remain separate. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "바로가기는 외부 서비스를 열며 로그인과 요금은 별도입니다. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "097",
  "day": 29,
  "title": "Choosing AI tools",
  "koTitle": "AI 도구 선택",
  "body": "Choose tools by task, quality, privacy and cost rather than brand alone. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "브랜드만 보지 말고 업무·품질·개인정보·비용으로 도구를 고르세요. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "098",
  "day": 30,
  "title": "Responsible learning",
  "koTitle": "책임 있는 학습",
  "body": "Use feedback to improve understanding instead of copying answers without thought. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "답만 복사하지 말고 피드백으로 이해를 높이세요. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "099",
  "day": 30,
  "title": "Course completion versus qualification",
  "koTitle": "수료와 자격의 차이",
  "body": "An RC course certificate records completion, not a professional licence. Practice: explain this in your own words. Ask the AI tutor for an example and a counterexample, then apply the idea to a fictional situation.",
  "ko": "RC 수료증은 과정 이수 기록이며 전문 면허가 아닙니다. 실습: 본인의 말로 설명하세요. AI 선생님에게 예시와 반례를 요청한 뒤 가상 상황에 적용하세요."
 },
 {
  "id": "100",
  "day": 30,
  "title": "Final capstone: build and report",
  "koTitle": "종합 프로젝트: 제작과 보고",
  "body": "Deliver a useful AI-assisted product or workflow and its company report. Include the user need, working draft or code, evidence checks, privacy decisions, tests, costs, limitations and your next improvement. Explain which parts you verified yourself.",
  "ko": "AI로 만든 유용한 결과물 또는 업무 절차와 회사 보고서를 제출하세요. 사용자 요구·실제 초안이나 코드·근거 확인·개인정보 처리·시험·비용·한계·다음 개선을 포함하고 직접 검증한 부분을 설명하세요."
 }
] as const;
export type LessonId = typeof lessons[number]['id'];
export type Question = {id:string;lesson:LessonId;text:string;ko:string;options:string[];koOptions:string[]};
export type Certificate = {id:string;name:string;issuedAt:string;score:number};
export type LearningState = {work?:Record<string,{artifact:string;feedback:string;score:number}>;completed:string[];certificate:Certificate|null};
