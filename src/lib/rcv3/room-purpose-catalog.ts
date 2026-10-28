import {changePurpose,roomPurposes,type RoomDraftInput} from "./room-draft";
export const roomPurposeCatalog = [
  {
    "id": "purpose-1-1",
    "group": [
      "Everyday life",
      "생활"
    ],
    "name": [
      "Daily planning",
      "일상 계획"
    ],
    "purpose": "custom"
  },
  {
    "id": "purpose-1-2",
    "group": [
      "Everyday life",
      "생활"
    ],
    "name": [
      "Family",
      "가족"
    ],
    "purpose": "custom"
  },
  {
    "id": "purpose-1-3",
    "group": [
      "Everyday life",
      "생활"
    ],
    "name": [
      "Personal secretary",
      "개인 비서"
    ],
    "purpose": "custom"
  },
  {
    "id": "purpose-1-4",
    "group": [
      "Everyday life",
      "생활"
    ],
    "name": [
      "Home budget",
      "가계부"
    ],
    "purpose": "custom"
  },
  {
    "id": "purpose-1-5",
    "group": [
      "Everyday life",
      "생활"
    ],
    "name": [
      "Travel planning",
      "여행 계획"
    ],
    "purpose": "custom"
  },
  {
    "id": "purpose-1-6",
    "group": [
      "Everyday life",
      "생활"
    ],
    "name": [
      "Retirement planning",
      "은퇴 생활"
    ],
    "purpose": "custom"
  },
  {
    "id": "purpose-2-1",
    "group": [
      "Learning",
      "학습"
    ],
    "name": [
      "Languages",
      "외국어"
    ],
    "purpose": "education"
  },
  {
    "id": "purpose-2-2",
    "group": [
      "Learning",
      "학습"
    ],
    "name": [
      "School study",
      "학교 공부"
    ],
    "purpose": "education"
  },
  {
    "id": "purpose-2-3",
    "group": [
      "Learning",
      "학습"
    ],
    "name": [
      "Exam preparation",
      "시험 준비"
    ],
    "purpose": "education"
  },
  {
    "id": "purpose-2-4",
    "group": [
      "Learning",
      "학습"
    ],
    "name": [
      "AI learning",
      "AI 배우기"
    ],
    "purpose": "education"
  },
  {
    "id": "purpose-2-5",
    "group": [
      "Learning",
      "학습"
    ],
    "name": [
      "Reading",
      "독서"
    ],
    "purpose": "education"
  },
  {
    "id": "purpose-2-6",
    "group": [
      "Learning",
      "학습"
    ],
    "name": [
      "Career skills",
      "직무 공부"
    ],
    "purpose": "education"
  },
  {
    "id": "purpose-3-1",
    "group": [
      "Hobbies",
      "취미"
    ],
    "name": [
      "Guitar",
      "기타 배우기"
    ],
    "purpose": "music"
  },
  {
    "id": "purpose-3-2",
    "group": [
      "Hobbies",
      "취미"
    ],
    "name": [
      "Piano",
      "피아노"
    ],
    "purpose": "music"
  },
  {
    "id": "purpose-3-3",
    "group": [
      "Hobbies",
      "취미"
    ],
    "name": [
      "Singing",
      "노래"
    ],
    "purpose": "music"
  },
  {
    "id": "purpose-3-4",
    "group": [
      "Hobbies",
      "취미"
    ],
    "name": [
      "Dance",
      "춤"
    ],
    "purpose": "dance"
  },
  {
    "id": "purpose-3-5",
    "group": [
      "Hobbies",
      "취미"
    ],
    "name": [
      "Cooking",
      "요리"
    ],
    "purpose": "custom"
  },
  {
    "id": "purpose-3-6",
    "group": [
      "Hobbies",
      "취미"
    ],
    "name": [
      "Gardening",
      "정원 가꾸기"
    ],
    "purpose": "custom"
  },
  {
    "id": "purpose-4-1",
    "group": [
      "Creative work",
      "창작"
    ],
    "name": [
      "Writing",
      "글쓰기"
    ],
    "purpose": "custom"
  },
  {
    "id": "purpose-4-2",
    "group": [
      "Creative work",
      "창작"
    ],
    "name": [
      "Photography",
      "사진"
    ],
    "purpose": "custom"
  },
  {
    "id": "purpose-4-3",
    "group": [
      "Creative work",
      "창작"
    ],
    "name": [
      "Video production",
      "영상 제작"
    ],
    "purpose": "custom"
  },
  {
    "id": "purpose-4-4",
    "group": [
      "Creative work",
      "창작"
    ],
    "name": [
      "Drawing",
      "그림"
    ],
    "purpose": "custom"
  },
  {
    "id": "purpose-4-5",
    "group": [
      "Creative work",
      "창작"
    ],
    "name": [
      "Crafts",
      "공예"
    ],
    "purpose": "custom"
  },
  {
    "id": "purpose-4-6",
    "group": [
      "Creative work",
      "창작"
    ],
    "name": [
      "Podcasting",
      "팟캐스트"
    ],
    "purpose": "custom"
  },
  {
    "id": "purpose-5-1",
    "group": [
      "Business",
      "사업"
    ],
    "name": [
      "Company office",
      "회사 업무"
    ],
    "purpose": "business"
  },
  {
    "id": "purpose-5-2",
    "group": [
      "Business",
      "사업"
    ],
    "name": [
      "Startup planning",
      "창업 준비"
    ],
    "purpose": "business"
  },
  {
    "id": "purpose-5-3",
    "group": [
      "Business",
      "사업"
    ],
    "name": [
      "Project management",
      "프로젝트 관리"
    ],
    "purpose": "business"
  },
  {
    "id": "purpose-5-4",
    "group": [
      "Business",
      "사업"
    ],
    "name": [
      "Customer support",
      "고객 응대"
    ],
    "purpose": "business"
  },
  {
    "id": "purpose-5-5",
    "group": [
      "Business",
      "사업"
    ],
    "name": [
      "Marketing",
      "마케팅"
    ],
    "purpose": "marketing"
  },
  {
    "id": "purpose-5-6",
    "group": [
      "Business",
      "사업"
    ],
    "name": [
      "Recruitment",
      "채용"
    ],
    "purpose": "recruitment"
  },
  {
    "id": "purpose-6-1",
    "group": [
      "Professional work",
      "전문 업무"
    ],
    "name": [
      "Legal work",
      "법률 업무"
    ],
    "purpose": "legal"
  },
  {
    "id": "purpose-6-2",
    "group": [
      "Professional work",
      "전문 업무"
    ],
    "name": [
      "Accounting",
      "회계"
    ],
    "purpose": "accounting"
  },
  {
    "id": "purpose-6-3",
    "group": [
      "Professional work",
      "전문 업무"
    ],
    "name": [
      "Property sales",
      "부동산 매매"
    ],
    "purpose": "realestate"
  },
  {
    "id": "purpose-6-4",
    "group": [
      "Professional work",
      "전문 업무"
    ],
    "name": [
      "Property management",
      "임대 관리"
    ],
    "purpose": "propertymanagement"
  },
  {
    "id": "purpose-6-5",
    "group": [
      "Professional work",
      "전문 업무"
    ],
    "name": [
      "Architecture",
      "건축 설계"
    ],
    "purpose": "architecture"
  },
  {
    "id": "purpose-6-6",
    "group": [
      "Professional work",
      "전문 업무"
    ],
    "name": [
      "Consulting",
      "컨설팅"
    ],
    "purpose": "consultation"
  },
  {
    "id": "purpose-7-1",
    "group": [
      "Shops and services",
      "상점·서비스"
    ],
    "name": [
      "Online shop",
      "온라인 쇼핑몰"
    ],
    "purpose": "retail"
  },
  {
    "id": "purpose-7-2",
    "group": [
      "Shops and services",
      "상점·서비스"
    ],
    "name": [
      "Restaurant",
      "식당"
    ],
    "purpose": "restaurant"
  },
  {
    "id": "purpose-7-3",
    "group": [
      "Shops and services",
      "상점·서비스"
    ],
    "name": [
      "Cafe",
      "카페"
    ],
    "purpose": "restaurant"
  },
  {
    "id": "purpose-7-4",
    "group": [
      "Shops and services",
      "상점·서비스"
    ],
    "name": [
      "Accommodation",
      "숙박업"
    ],
    "purpose": "hotel"
  },
  {
    "id": "purpose-7-5",
    "group": [
      "Shops and services",
      "상점·서비스"
    ],
    "name": [
      "Beauty salon",
      "미용실"
    ],
    "purpose": "beauty"
  },
  {
    "id": "purpose-7-6",
    "group": [
      "Shops and services",
      "상점·서비스"
    ],
    "name": [
      "Vehicle service",
      "자동차 정비"
    ],
    "purpose": "automotive"
  },
  {
    "id": "purpose-8-1",
    "group": [
      "Health and community",
      "건강·공동체"
    ],
    "name": [
      "Exercise planning",
      "운동 계획"
    ],
    "purpose": "fitness"
  },
  {
    "id": "purpose-8-2",
    "group": [
      "Health and community",
      "건강·공동체"
    ],
    "name": [
      "Wellbeing journal",
      "건강 기록"
    ],
    "purpose": "custom"
  },
  {
    "id": "purpose-8-3",
    "group": [
      "Health and community",
      "건강·공동체"
    ],
    "name": [
      "Clinic administration",
      "병원 행정"
    ],
    "purpose": "medical"
  },
  {
    "id": "purpose-8-4",
    "group": [
      "Health and community",
      "건강·공동체"
    ],
    "name": [
      "Community group",
      "지역 모임"
    ],
    "purpose": "custom"
  },
  {
    "id": "purpose-8-5",
    "group": [
      "Health and community",
      "건강·공동체"
    ],
    "name": [
      "Volunteering",
      "자원봉사"
    ],
    "purpose": "custom"
  },
  {
    "id": "purpose-8-6",
    "group": [
      "Health and community",
      "건강·공동체"
    ],
    "name": [
      "Family care planning",
      "가족 돌봄 계획"
    ],
    "purpose": "custom"
  },
  {
    "id": "purpose-9-1",
    "group": [
      "Technology",
      "기술"
    ],
    "name": [
      "Coding",
      "코딩"
    ],
    "purpose": "technology"
  },
  {
    "id": "purpose-9-2",
    "group": [
      "Technology",
      "기술"
    ],
    "name": [
      "Website planning",
      "웹사이트 제작"
    ],
    "purpose": "website"
  },
  {
    "id": "purpose-9-3",
    "group": [
      "Technology",
      "기술"
    ],
    "name": [
      "Data analysis",
      "데이터 분석"
    ],
    "purpose": "technology"
  },
  {
    "id": "purpose-9-4",
    "group": [
      "Technology",
      "기술"
    ],
    "name": [
      "IT support",
      "IT 지원"
    ],
    "purpose": "technology"
  },
  {
    "id": "purpose-9-5",
    "group": [
      "Technology",
      "기술"
    ],
    "name": [
      "Product design",
      "제품 설계"
    ],
    "purpose": "technology"
  },
  {
    "id": "purpose-9-6",
    "group": [
      "Technology",
      "기술"
    ],
    "name": [
      "Automation planning",
      "자동화 계획"
    ],
    "purpose": "technology"
  },
  {
    "id": "purpose-10-1",
    "group": [
      "Research and industry",
      "연구·산업"
    ],
    "name": [
      "Plant research",
      "식물 연구"
    ],
    "purpose": "agriculture"
  },
  {
    "id": "purpose-10-2",
    "group": [
      "Research and industry",
      "연구·산업"
    ],
    "name": [
      "Scientific research",
      "과학 연구"
    ],
    "purpose": "custom"
  },
  {
    "id": "purpose-10-3",
    "group": [
      "Research and industry",
      "연구·산업"
    ],
    "name": [
      "Space research",
      "우주 연구"
    ],
    "purpose": "spaceresearch"
  },
  {
    "id": "purpose-10-4",
    "group": [
      "Research and industry",
      "연구·산업"
    ],
    "name": [
      "Construction",
      "건설"
    ],
    "purpose": "construction"
  },
  {
    "id": "purpose-10-5",
    "group": [
      "Research and industry",
      "연구·산업"
    ],
    "name": [
      "Manufacturing",
      "제조"
    ],
    "purpose": "manufacturing"
  },
  {
    "id": "purpose-10-6",
    "group": [
      "Research and industry",
      "연구·산업"
    ],
    "name": [
      "Logistics",
      "물류"
    ],
    "purpose": "logistics"
  }
] as const;
export function catalogLabel(pair:readonly [string,string],language:string){return language.startsWith("ko")?`${pair[0]} · ${pair[1]}`:pair[0];}
export function selectRoomPurpose(input:RoomDraftInput,id:string,language:string):RoomDraftInput {
 const entry=roomPurposeCatalog.find(item=>item.id===id);
 if(!entry)throw new Error("Unknown room purpose");
 const purpose=roomPurposes.find(item=>item.id===entry.purpose)!;
 const brief=language.startsWith("ko")?entry.name[1]:entry.name[0];
 // Keep customer-authored names, chosen design, provider and connection settings.
 return {...changePurpose(input,purpose.id),brief,name:input.name.trim()?input.name:brief,
 answers:purpose.id==="custom"?{purpose:[brief]}:{},tasks:[...purpose.suggestedAgents]};
}
