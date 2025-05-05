export interface OrgChartNode {
    id: number;
    position1: string;
    position2: string;
    name: string;
    email: string;
    status: 'present' | 'busy' | 'travel' | 'vacation';
    cluster: 'a' | 'b' | 'c' | 'd' | '';
    icon: string;
    subordinates?: number[];
     layout?: "vertical" | "horizontal"; // 👈 Add this
  }
  
  export const mockData: OrgChartNode[] = [
    {
      id: 1,
      position1: "Provincial Director",
      position2: "",
      name: "Engr. Danilo A. Nobleza",
      email: "sampleemail@gmail.com",
      status: "present",
      icon: "../pd.png",
      cluster: '',
      subordinates: [2, 10, 18, 999, 26],
       layout: "horizontal",
    },
    {
      id: 2,
      position1: "LGOO VII",
      position2: "Head of Cluster A",
      name: "Nencita N. Costelo",
      email: "sample@example.com",
      status: "present",
      cluster: "a",
      icon: "https://via.placeholder.com/60",
      layout: "vertical",
      subordinates: [3, 4, 5, 6, 7, 8, 37, 38],
      
    },
    { id: 999, position1: "",position2: "Cavite City", name: "Ma. Normita H. Arceo", email: "sample@example.com", status: "present", cluster: "a", icon: "https://via.placeholder.com/60" },

    { id: 3, position1: "LGOO VI",position2: "Cavite City", name: "Ma. Normita H. Arceo", email: "sample@example.com", status: "present", cluster: "a", icon: "https://via.placeholder.com/60" },
    { id: 4, position1: "LGOO VI",position2: "City of Bacoor", name: "Joseph Ryan V. Geronimo", email: "sample@example.com", status: "present", cluster: "a", icon: "https://via.placeholder.com/60" },
    { id: 5, position1: "LGOO VI",position2: "City of Imus", name: "Mary Roxanne T. Vicedo", email: "sample@example.com", status: "present", cluster: "a", icon: "https://via.placeholder.com/60" },
    { id: 6, position1: "LGOO VI",position2: "Noveleta", name: "Maria Melita O. Villaruel", email: "sample@example.com", status: "present", cluster: "a", icon: "https://via.placeholder.com/60" },
    { id: 7, position1: "LGOO VI",position2: "Rosario", name: "Evelyn T. Alvarez", email: "sample@example.com", status: "present", cluster: "a", icon: "https://via.placeholder.com/60" },
    { id: 8, position1: "LGOO VI",position2: "Kawit", name: "Julie Anne M. Jolampong", email: "sample@example.com", status: "present", cluster: "a", icon: "https://via.placeholder.com/60" },
    { id: 37, position1: "LGOO III",position2: "Technical Staff", name: "Janica Zandra V. Mendoza", email: "sample@example.com", status: "present", cluster: "a", icon: "https://via.placeholder.com/60" },
    { id: 38, position1: "ADA IV",position2: "Administrative Staff", name: "Michelle A. Aguipo", email: "sample@example.com", status: "present", cluster: "a", icon: "https://via.placeholder.com/60" },

    {
      id: 10,
      position1: "",
      position2: "Head of Cluster B",
      name: "Celia A. Martial",
      email: "sample@example.com",
      status: "present",
      layout: "vertical",
      cluster: "b",
      icon: "https://via.placeholder.com/60",
      subordinates: [11, 12, 13, 14, 15, 16, 17],
    },
    { id: 11, position1: "",
position2: "Tagaytay City", name: "Jerome M. Lingan", email: "sample@example.com", status: "present", cluster: "b", icon: "https://via.placeholder.com/60" },
    { id: 12, position1: "",position2: "Magallanes", name: "Abegail B. Beltran", email: "sample@example.com", status: "present", cluster: "b", icon: "https://via.placeholder.com/60" },
    { id: 13, position1: "",position2: "Alfonso", name: "Alladino P. Calanog", email: "sample@example.com", status: "present", cluster: "b", icon: "https://via.placeholder.com/60" },
    { id: 14, position1: "",position2: "General Emilio Aguinaldo", name: "Jermiluz R. De Castro-Gadon", email: "sample@example.com", status: "present", cluster: "b", icon: "https://via.placeholder.com/60" },
    { id: 15, position1: "",position2: "Maragondon", name: "Josephine S. Dela Rosa", email: "sample@example.com", status: "present", cluster: "b", icon: "https://via.placeholder.com/60" },
    { id: 16, position1: "",position2: "Naic", name: "Christine B. Sierra", email: "sample@example.com", status: "present", cluster: "b", icon: "https://via.placeholder.com/60" },
    { id: 17, position1: "",position2: "Mendez Nuñez", name: "JOnalyn Cate V. Magcayang", email: "sample@example.com", status: "present", cluster: "b", icon: "https://via.placeholder.com/60" },
  
    {
      id: 18,
      position1: "",
      position2: "Head of Cluster C",
      name: "Marcial A. Juangco",
      email: "sample@example.com",
      status: "present",
      layout: "vertical",
      cluster: "c",
      icon: "https://via.placeholder.com/60",
      subordinates: [19],
    },
    { id: 19, position1: "",
position2: "Tagaytay City", name: "Jerome M. Lingan", email: "sample@example.com", status: "present", cluster: "c", icon: "https://via.placeholder.com/60" },
  
    {
      id: 26,
      position1: "",
      position2: "Project Manager",
      name: "Charmaine R. Lopez",
      email: "sample@example.com",
      status: "present",
      layout: "horizontal",
      cluster: "d",
      icon: "https://via.placeholder.com/60",
      subordinates: [27, 31, 35],
    },
    {
      id: 27,
      position1: "",
      position2: "CDS Chief",
      name: "Marren E. Juangco-Bautista",
      email: "sample@example.com",
      status: "present",
      layout: "vertical",
      cluster: "d",
      icon: "https://via.placeholder.com/60",
      subordinates: [28, 29, 30],
    },
    { id: 28, position1: "",position2: "Technical Staff", name: "Niña Norisa C. Maranga", email: "sample@example.com", status: "present", cluster: "d", icon: "https://via.placeholder.com/60" },
    { id: 29, position1: "",position2: "Technical Staff", name: "Niña Norisa C. Maranga", email: "sample@example.com", status: "present", cluster: "d", icon: "https://via.placeholder.com/60" },
    { id: 30, position1: "",position2: "Technical Staff", name: "Niña Norisa C. Maranga", email: "sample@example.com", status: "present", cluster: "d", icon: "https://via.placeholder.com/60" },
  
    {
      id: 31,
      position1: "",
      position2: "OIC-MES Chief",
      name: "James Carl F. Torres",
      email: "sample@example.com",
      status: "present",
      layout: "vertical",
      cluster: "d",
      icon: "https://via.placeholder.com/60",
      subordinates: [32],
    },
    { id: 32, position1: "",position2: "Technical Staff", name: "Maria May M. Ambata", email: "sample@example.com", status: "present", cluster: "d", icon: "https://via.placeholder.com/60" },
  
    {
      id: 35,
      position1: "",
      position2: "OIC-MES Chief",
      name: "James Carl F. Torres",
      email: "sample@example.com",
      status: "present",
      layout: "vertical",
      cluster: "d",
      icon: "https://via.placeholder.com/60",
      subordinates: [36],
    },
    { id: 36, position1: "",position2: "Technical Staff", name: "Maria May M. Ambata", email: "sample@example.com", status: "present", cluster: "d", icon: "https://via.placeholder.com/60" },
  ];
  