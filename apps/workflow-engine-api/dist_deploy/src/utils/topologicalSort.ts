export class TopologicalSorter {
  sort(graph: Map<string, string[]>): string[] {
    const inDegree = new Map<string, number>();
    const result: string[] = [];
    const queue: string[] = [];

    // Initialize in-degree count
    for (const [node, dependencies] of graph) {
      if (!inDegree.has(node)) {
        inDegree.set(node, 0);
      }
      
      for (const dep of dependencies) {
        if (!inDegree.has(dep)) {
          inDegree.set(dep, 0);
        }
        inDegree.set(node, (inDegree.get(node) || 0) + 1);
      }
    }

    // Find nodes with no dependencies
    for (const [node, degree] of inDegree) {
      if (degree === 0) {
        queue.push(node);
      }
    }

    // Process nodes in topological order
    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      // Reduce in-degree for dependent nodes
      for (const [node, dependencies] of graph) {
        if (dependencies.includes(current)) {
          const newDegree = (inDegree.get(node) || 0) - 1;
          inDegree.set(node, newDegree);
          
          if (newDegree === 0) {
            queue.push(node);
          }
        }
      }
    }

    // Check for cycles
    if (result.length !== graph.size) {
      throw new Error('Circular dependency detected in workflow');
    }

    return result;
  }
}
