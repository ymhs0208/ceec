
export interface ExamSubjectSchedule {
  name: string;
  start: string; // 'HH:mm'
  end: string;   // 'HH:mm'
  description?: string;
  groups?: string[];
}

export interface ExamDaySchedule {
  date: string; // 'YYYY-MM-DD'
  subjects: ExamSubjectSchedule[];
}

export interface ExamPreset {
  id: string;
  name: string;
  date: string;
  shortName: string;
  category: 'gsat' | 'tvet' | 'cap' | 'ast';
  year: number;
  isEstimated?: boolean;
  schedule?: ExamDaySchedule[];
}

export const TVET_CATEGORIES = [
  { id: '01', name: '機械群' },
  { id: '02', name: '動力機械群' },
  { id: '03', name: '電機與電子群電機類' },
  { id: '04', name: '電機與電子群資電類' },
  { id: '05', name: '化工群' },
  { id: '06', name: '土木與建築群' },
  { id: '07', name: '設計群' },
  { id: '08', name: '工程與管理類' },
  { id: '09', name: '商業與管理群' },
  { id: '10', name: '衛生與護理類' },
  { id: '11', name: '食品群' },
  { id: '12', name: '家政群幼保類' },
  { id: '13', name: '家政群生活應用類' },
  { id: '14', name: '農業群' },
  { id: '15', name: '外語群英語類' },
  { id: '16', name: '外語群日語類' },
  { id: '17', name: '餐旅群' },
  { id: '18', name: '海事群' },
  { id: '19', name: '水產群' },
  { id: '20', name: '藝術群影視類' },
  { id: '51', name: '電機電子群(跨考)-03類+04類' },
  { id: '52', name: '家政群(跨考)-12類+13類' },
  { id: '53', name: '商管外語群(一)-09類+15類' },
  { id: '54', name: '商管外語群(二)-09類+16類' },
  { id: '55', name: '商管外語群(三)-15類+16類' },
  { id: '56', name: '商管外語群(四)-09類+15+16類' }
];

export const EXAM_PRESETS: ExamPreset[] = [
  { 
    id: '117gsat', 
    name: '117學測 (預計)', 
    shortName: '學測', 
    category: 'gsat',
    year: 117,
    isEstimated: true,
    date: '2028-01-22T09:20:00',
    schedule: [
      {
        date: '2028-01-22',
        subjects: [
          { name: '數學A', start: '09:20', end: '11:00' },
          { name: '自然', start: '12:50', end: '14:40' }
        ]
      },
      {
        date: '2028-01-23',
        subjects: [
          { name: '英文', start: '09:20', end: '11:00' },
          { name: '國綜', start: '12:50', end: '14:20' },
          { name: '國寫', start: '15:20', end: '16:50' }
        ]
      },
      {
        date: '2028-01-24',
        subjects: [
          { name: '數學B', start: '09:20', end: '11:00' },
          { name: '社會', start: '12:50', end: '14:40' }
        ]
      }
    ]
  },
  { 
    id: '116gsat', 
    name: '116學測', 
    shortName: '學測', 
    category: 'gsat',
    year: 116,
    date: '2027-01-22T09:20:00',
    schedule: [
      {
        date: '2027-01-22',
        subjects: [
          { name: '數學A', start: '09:20', end: '11:00' },
          { name: '自然', start: '12:50', end: '14:40' }
        ]
      },
      {
        date: '2027-01-23',
        subjects: [
          { name: '英文', start: '09:20', end: '11:00' },
          { name: '國綜', start: '12:50', end: '14:20' },
          { name: '國寫', start: '15:20', end: '16:50' }
        ]
      },
      {
        date: '2027-01-24',
        subjects: [
          { name: '數學B', start: '09:20', end: '11:00' },
          { name: '社會', start: '12:50', end: '14:40' }
        ]
      }
    ]
  },
  { 
    id: '116cap', 
    name: '116會考 (預計)', 
    shortName: '會考', 
    category: 'cap',
    year: 116,
    isEstimated: true,
    date: '2027-05-15T08:30:00',
    schedule: [
      {
        date: '2027-05-15',
        subjects: [
          { name: '社會', start: '08:30', end: '09:40' },
          { name: '數學', start: '10:30', end: '11:50' },
          { name: '國文', start: '13:50', end: '15:00' },
          { name: '寫作測驗', start: '15:50', end: '16:40' }
        ]
      },
      {
        date: '2027-05-16',
        subjects: [
          { name: '自然', start: '08:30', end: '09:40' },
          { name: '英語(閱讀)', start: '10:30', end: '11:30' },
          { name: '英語(聽力)', start: '12:05', end: '12:30' }
        ]
      }
    ]
  },
  { 
    id: '116ast', 
    name: '116分科測驗 (預計)', 
    shortName: '分科', 
    category: 'ast',
    year: 116,
    isEstimated: true,
    date: '2027-07-10T08:40:00',
    schedule: [
      {
        date: '2027-07-10',
        subjects: [
          { name: '物理', start: '08:40', end: '10:00' },
          { name: '化學', start: '10:50', end: '12:10' },
          { name: '數學甲', start: '14:00', end: '15:20' },
          { name: '生物', start: '16:10', end: '17:30' }
        ]
      },
      {
        date: '2027-07-11',
        subjects: [
          { name: '歷史', start: '08:40', end: '10:00' },
          { name: '地理', start: '10:50', end: '12:10' },
          { name: '公民與社會', start: '14:00', end: '15:20' }
        ]
      }
    ]
  },
  { 
    id: '116tvet', 
    name: '116統測(預計)', 
    shortName: '統測', 
    category: 'tvet',
    year: 116,
    isEstimated: true,
    date: '2027-04-24T10:20:00',
    schedule: [
      {
        date: '2027-04-24',
        subjects: [
          { name: '專業科目(二)', start: '10:20', end: '12:00', description: '包含群別 03、07、12、15、51-53、55-56', groups: ['03', '07', '12', '15', '51', '52', '53', '55', '56'] },
          { name: '國文', start: '13:30', end: '15:10' },
          { name: '英文', start: '16:00', end: '17:40' }
        ]
      },
      {
        date: '2027-04-25',
        subjects: [
          { name: '專業科目(二)', start: '08:30', end: '10:10', description: '包含群別 01-02、04-06、08-11、13-14、17-20、51-54、56', groups: ['01', '02', '04', '05', '06', '08', '09', '10', '11', '13', '14', '17', '18', '19', '20', '51', '52', '53', '54', '56'] },
          { name: '數學', start: '11:00', end: '12:20' },
          { name: '專業科目(一)', start: '13:30', end: '15:10' },
          { name: '專業科目(二)', start: '16:00', end: '17:40', description: '包含群別 16、54-56', groups: ['16', '54', '55', '56'] }
        ]
      }
    ]
  },
  { 
    id: '115tvet', 
    name: '115統測', 
    shortName: '統測', 
    category: 'tvet',
    year: 115,
    date: '2026-04-25T10:20:00',
    schedule: [
      {
        date: '2026-04-25',
        subjects: [
          { name: '專業科目(二)', start: '10:20', end: '12:00', description: '包含群別 03、07、12、15、51-53、55-56', groups: ['03', '07', '12', '15', '51', '52', '53', '55', '56'] },
          { name: '國文', start: '13:30', end: '15:10' },
          { name: '英文', start: '16:00', end: '17:40' }
        ]
      },
      {
        date: '2026-04-26',
        subjects: [
          { name: '專業科目(二)', start: '08:30', end: '10:10', description: '包含群別 01-02、04-06、08-11、13-14、17-20、51-54、56', groups: ['01', '02', '04', '05', '06', '08', '09', '10', '11', '13', '14', '17', '18', '19', '20', '51', '52', '53', '54', '56'] },
          { name: '數學', start: '11:00', end: '12:20' },
          { name: '專業科目(一)', start: '13:30', end: '15:10' },
          { name: '專業科目(二)', start: '16:00', end: '17:40', description: '包含群別 16、54-56', groups: ['16', '54', '55', '56'] }
        ]
      }
    ]
  },
  { 
    id: '115cap', 
    name: '115會考', 
    shortName: '會考', 
    category: 'cap',
    year: 115,
    date: '2026-05-16T08:30:00',
    schedule: [
      {
        date: '2026-05-16',
        subjects: [
          { name: '社會', start: '08:30', end: '09:40' },
          { name: '數學', start: '10:30', end: '11:50' },
          { name: '國文', start: '13:50', end: '15:00' },
          { name: '寫作測驗', start: '15:50', end: '16:40' }
        ]
      },
      {
        date: '2026-05-17',
        subjects: [
          { name: '自然', start: '08:30', end: '09:40' },
          { name: '英語(閱讀)', start: '10:30', end: '11:30' },
          { name: '英語(聽力)', start: '12:05', end: '12:30' }
        ]
      }
    ]
  },
  { 
    id: '115ast', 
    name: '115分科測驗', 
    shortName: '分科', 
    category: 'ast',
    year: 115,
    date: '2026-07-13T08:40:00',
    schedule: [
      {
        date: '2026-07-13',
        subjects: [
          { name: '物理', start: '08:40', end: '10:00' },
          { name: '化學', start: '10:50', end: '12:10' },
          { name: '數學甲', start: '14:00', end: '15:20' },
          { name: '生物', start: '16:10', end: '17:30' }
        ]
      },
      {
        date: '2026-07-14',
        subjects: [
          { name: '歷史', start: '08:40', end: '10:00' },
          { name: '地理', start: '10:50', end: '12:10' },
          { name: '數學乙', start: '14:00', end: '15:20' },
          { name: '公民與社會', start: '16:10', end: '17:30' }
        ]
      }
    ]
  },
];
