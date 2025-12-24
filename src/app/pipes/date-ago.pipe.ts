import { Pipe, PipeTransform } from '@angular/core'

@Pipe({
  name: 'dateAgo',
  standalone: true,
})

export class DateAgoPipe implements PipeTransform {

  transform(value: string | Date | null | undefined): string {
    if (!value) {
      return ''
    }

    const date = new Date(value)
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000)

    // Less than 30 seconds
    if (seconds < 30) {
      return 'Just now'
    }

    const intervals: Record<string, number> = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60,
      second: 1,
    }

    for (const unit in intervals) {
      const count = Math.floor(seconds / intervals[unit])

      if (count > 0) {
        return count === 1
          ? `${count} ${unit} ago`
          : `${count} ${unit}s ago`
      }
    }

    return ''
  }
}