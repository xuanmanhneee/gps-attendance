import { Unit } from './unit.model';

export class UnitNode implements Unit {
  id: number;
  externalCode: string | null;
  name: string;
  parentId: number | null;
  level: number;
  children: UnitNode[] = [];
  parent: UnitNode | null = null;

  constructor(unit: Unit) {
    this.id = unit.id;
    this.externalCode = unit.externalCode;
    this.name = unit.name;
    this.parentId = unit.parentId;
    this.level = unit.level;
  }

  addChild(child: UnitNode): void {
    child.parent = this;
    this.children.push(child);
  }

  isLeaf(): boolean {
    return this.children.length === 0;
  }

  /** Tìm node theo id trong nhánh của chính node này (DFS) */
  find(id: number): UnitNode | null {
    if (this.id === id) return this;
    for (const child of this.children) {
      const found = child.find(id);
      if (found) return found;
    }
    return null;
  }

  /** Lấy tất cả leaf id trong nhánh, cho phép loại trừ 1 node (và con cháu) */
  getLeafIds(excludeId?: number): number[] {
    if (excludeId !== undefined && this.id === excludeId) return [];
    if (this.isLeaf()) return [this.id];
    return this.children.flatMap((child) => child.getLeafIds(excludeId));
  }

  /** Kiểm tra node này có phải tổ tiên của node kia không */
  isAncestorOf(node: UnitNode): boolean {
    let current = node.parent;
    while (current) {
      if (current.id === this.id) return true;
      current = current.parent;
    }
    return false;
  }

  /** Đường dẫn từ root đến node này (bao gồm chính nó) — dùng cho breadcrumb */
  getAncestorPath(): UnitNode[] {
    const path: UnitNode[] = [this];
    let current = this.parent;
    while (current) {
      path.unshift(current);
      current = current.parent;
    }
    return path;
  }

  /** Đếm tổng số node trong nhánh (bao gồm chính nó) */
  countDescendants(): number {
    return 1 + this.children.reduce((sum, c) => sum + c.countDescendants(), 0);
  }
}

/**
 * UnitTree: đại diện cho ĐÚNG 1 cây tổ chức, bọc quanh 1 root duy nhất.
 * Có index nội bộ để tra cứu O(1) trong phạm vi cây này,
 * thay vì phải gọi node.find() (DFS, O(n)) từ root mỗi lần.
 */
export class UnitTree {
  readonly root: UnitNode;
  private nodeMap = new Map<number, UnitNode>();

  constructor(root: UnitNode) {
    this.root = root;
    this.indexNode(root);
  }

  private indexNode(node: UnitNode): void {
    this.nodeMap.set(node.id, node);
    node.children.forEach((child) => this.indexNode(child));
  }

  /** Tra cứu node theo id trong cây này, O(1) */
  find(id: number): UnitNode | null {
    return this.nodeMap.get(id) ?? null;
  }

  /** Tổng số node trong cây này */
  get size(): number {
    return this.nodeMap.size;
  }
}

/**
 * UnitForest: tập hợp các UnitTree được dựng từ flat list Unit[].
 * Gọi là "Forest" vì dữ liệu thô từ DB không đảm bảo chỉ có 1 node gốc
 * (parentId === null có thể xuất hiện nhiều lần) — mỗi gốc là 1 UnitTree độc lập.
 */
export class UnitForest {
  trees: UnitTree[] = [];
  private nodeMap = new Map<number, UnitNode>(); // index toàn cục, tra cứu xuyên mọi cây

  constructor(units: Unit[]) {
    const rawNodeMap = new Map<number, UnitNode>();
    units.forEach((u) => rawNodeMap.set(u.id, new UnitNode(u)));

    const roots: UnitNode[] = [];
    units.forEach((u) => {
      const node = rawNodeMap.get(u.id)!;
      if (u.parentId === null) {
        roots.push(node);
      } else {
        const parent = rawNodeMap.get(u.parentId);
        if (!parent) {
          throw new Error(
            `Đơn vị id=${u.id} tham chiếu tới parentId=${u.parentId} không tồn tại`,
          );
        }
        parent.addChild(node);
      }
    });

    this.trees = roots.map((root) => new UnitTree(root));
    rawNodeMap.forEach((node, id) => this.nodeMap.set(id, node));
  }

  /** Tra cứu node theo id, xuyên suốt mọi cây trong forest, O(1) */
  find(id: number): UnitNode | null {
    return this.nodeMap.get(id) ?? null;
  }

  /** Có bao nhiêu cây độc lập trong forest này */
  get treeCount(): number {
    return this.trees.length;
  }

  /** Tổng số node trong toàn forest */
  get size(): number {
    return this.nodeMap.size;
  }
}
