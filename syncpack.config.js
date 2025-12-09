/** @type {import("syncpack").RcFile} */
module.exports = {
  dependencyTypes: ['!local'],
  versionGroups: [
    {
      label: 'Ensure NestJS dependencies always use the same version',
      packages: ['**'],
      dependencies: ['@nestjs/core', '@nestjs/common', '@nestjs/platform-fastify', '@nestjs/testing']
    },
    {
      label: 'Use workspace protocol when developing local packages',
      packages: ['**'],
      dependencies: ['$LOCAL'],
      pinVersion: 'workspace:^'
    },
    {
      label: '@types packages should only be under devDependencies',
      dependencies: ['@types/**'],
      dependencyTypes: ['!dev'],
      isBanned: true
    }
  ],
  semverGroups: [
    {
      range: '',
      dependencyTypes: ['prod', 'resolutions', 'overrides', 'pnpmOverrides'],
      dependencies: ['**'],
      packages: ['**']
    },
    {
      range: '~',
      dependencyTypes: ['dev'],
      dependencies: ['**'],
      packages: ['**']
    },
    {
      range: '^',
      dependencyTypes: ['peer'],
      dependencies: ['**'],
      packages: ['**']
    }
  ]
}
