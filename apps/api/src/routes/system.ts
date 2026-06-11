import type { FastifyInstance } from 'fastify'
import { requireRole } from '../middleware/auth'
import { execSync } from 'child_process'
import os from 'os'

export default async function systemRoutes(fastify: FastifyInstance): Promise<void> {
  // GET / — Real system metrics
  fastify.get('/', { preHandler: [requireRole('admin', 'analyst', 'viewer')] }, async () => {
    try {
      // RAM
      const totalMem = os.totalmem()
      const freeMem = os.freemem()
      const usedMem = totalMem - freeMem
      const memPercent = Math.round((usedMem / totalMem) * 100)

      // CPU
      const cpus = os.cpus()
      const cpuModel = cpus[0]?.model || 'Unknown'
      const cpuCores = cpus.length
      const loadAvg = os.loadavg()
      const cpuPercent = Math.round((loadAvg[0] / cpuCores) * 100)

      // Disk
      let diskUsed = 0
      let diskTotal = 0
      let diskPercent = 0
      try {
        const dfOutput = execSync('df -B1 / | tail -1', { encoding: 'utf8' })
        const parts = dfOutput.trim().split(/\s+/)
        diskTotal = parseInt(parts[1]) || 0
        diskUsed = parseInt(parts[2]) || 0
        diskPercent = diskTotal > 0 ? Math.round((diskUsed / diskTotal) * 100) : 0
      } catch {}

      // Uptime
      const uptimeSeconds = os.uptime()
      const uptimeDays = Math.floor(uptimeSeconds / 86400)
      const uptimeHours = Math.floor((uptimeSeconds % 86400) / 3600)

      // Security tools detection
      const tools = [
        { name: 'Nuclei', path: '/usr/local/bin/nuclei' },
        { name: 'Nmap', path: '/usr/bin/nmap' },
        { name: 'Nikto', path: '/usr/bin/nikto' },
        { name: 'Subfinder', path: '/usr/local/bin/subfinder' },
        { name: 'WhatWeb', path: '/usr/bin/whatweb' },
        { name: 'Gobuster', path: '/usr/local/bin/gobuster' },
        { name: 'GAU', path: '/usr/local/bin/gau' },
        { name: 'HTTPX', path: '/usr/local/bin/httpx' },
      ]

      const installedTools = tools.map(t => {
        try {
          execSync(`test -x ${t.path}`, { stdio: 'ignore' })
          return { name: t.name, installed: true }
        } catch {
          return { name: t.name, installed: false }
        }
      })

      return {
        ram: {
          total: totalMem,
          used: usedMem,
          free: freeMem,
          percent: memPercent,
          totalGB: (totalMem / 1073741824).toFixed(1),
          usedGB: (usedMem / 1073741824).toFixed(1),
        },
        cpu: {
          model: cpuModel,
          cores: cpuCores,
          loadAvg: loadAvg.map((l: number) => l.toFixed(2)),
          percent: Math.min(cpuPercent, 100),
        },
        disk: {
          total: diskTotal,
          used: diskUsed,
          percent: diskPercent,
          totalGB: (diskTotal / 1073741824).toFixed(0),
          usedGB: (diskUsed / 1073741824).toFixed(0),
        },
        uptime: {
          seconds: uptimeSeconds,
          days: uptimeDays,
          hours: uptimeHours,
          display: `${uptimeDays}d ${uptimeHours}h`,
        },
        tools: installedTools,
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
      }
    } catch (err: any) {
      return { error: err.message }
    }
  })
}
