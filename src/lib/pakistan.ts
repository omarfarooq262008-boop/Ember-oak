export interface PakistanProvince {
  name: string
  slug: string
  cities: string[]
}

export const pakistanProvinces: PakistanProvince[] = [
  {
    name: 'Sindh',
    slug: 'sindh',
    cities: [
      'Karachi',
      'Hyderabad',
      'Sukkur',
      'Larkana',
      'Mirpur Khas',
      'Nawabshah',
      'Jacobabad',
      'Thatta',
      'Badin',
      'Dadu',
    ],
  },
  {
    name: 'Punjab',
    slug: 'punjab',
    cities: [
      'Lahore',
      'Faisalabad',
      'Rawalpindi',
      'Multan',
      'Gujranwala',
      'Sialkot',
      'Bahawalpur',
      'Sargodha',
      'Sheikhupura',
      'Gujrat',
      'Jhelum',
      'Sahiwal',
    ],
  },
  {
    name: 'KPK',
    slug: 'kpk',
    cities: [
      'Peshawar',
      'Mardan',
      'Abbottabad',
      'Swat (Mingora)',
      'Kohat',
      'Bannu',
      'Dera Ismail Khan',
      'Mansehra',
      'Haripur',
    ],
  },
  {
    name: 'Balochistan',
    slug: 'balochistan',
    cities: [
      'Quetta',
      'Gwadar',
      'Turbat',
      'Khuzdar',
      'Chaman',
      'Hub',
      'Sibi',
      'Zhob',
    ],
  },
  {
    name: 'Islamabad Capital Territory',
    slug: 'islamabad-capital-territory',
    cities: ['Islamabad', 'Rawalpindi (ICT fringe)'],
  },
  {
    name: 'Gilgit-Baltistan',
    slug: 'gilgit-baltistan',
    cities: ['Gilgit', 'Skardu', 'Hunza (Karimabad)', 'Ghizer', 'Diamer'],
  },
  {
    name: 'AJK',
    slug: 'ajk',
    cities: ['Muzaffarabad', 'Mirpur', 'Rawalakot', 'Kotli', 'Bagh', 'Bhimber'],
  },
]

export function getProvinceBySlug(slug: string): PakistanProvince | undefined {
  return pakistanProvinces.find((p) => p.slug === slug)
}

export function getCitiesForProvince(provinceName: string): string[] {
  const province = pakistanProvinces.find(
    (p) => p.name.toLowerCase() === provinceName.toLowerCase(),
  )
  return province?.cities ?? []
}
