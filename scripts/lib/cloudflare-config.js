export function configureWranglerProject(config, projectName, database) {
  const result = { ...config, name: projectName }
  if (result.d1_databases?.some((binding) => binding.binding === 'DB') || !database) return result
  return {
    ...result,
    d1_databases: [
      ...(result.d1_databases || []),
      {
        binding: 'DB',
        database_name: database.name,
        database_id: database.uuid,
      },
    ],
  }
}
